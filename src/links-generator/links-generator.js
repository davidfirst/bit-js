// @flow
import path from 'path';
import R from 'ramda';
import BitJson from 'bit-scope-client/bit-json';
import camelcase from 'camelcase';
import { MODULE_NAME,
  MODULES_DIR,
  COMPONENTS_DIRNAME,
  VERSION_DELIMITER,
  ID_DELIMITER,
  INDEX_JS,
  INLINE_COMPONENTS_DIRNAME } from '../constants';
import { writeFileP } from '../utils';

const linkTemplate = (link: string): string => `module.exports = require('${link}');`;
const namespaceTemplate = (name: string): string => `${camelcase(name)}: require('./${name}')`;
const linksTemplate = (links: string[]): string => `module.exports = {
  ${links.join(',\n  ')}
};`;

function findAllDependenciesInComponentMap(componentsMap: Object, components: Array<string>,
  dependenciesArr: Array<string> = []) {
  components.forEach((component) => {
    if (componentsMap[component] && componentsMap[component].dependencies.length) {
      findAllDependenciesInComponentMap(
        componentsMap,
        componentsMap[component].dependencies,
        dependenciesArr.concat(componentsMap[component].dependencies));
    }
  });

  return dependenciesArr;
}

function filterNonReferencedComponents(
  componentsMap: Object, projectBitJson: BitJson,
): Array<string> {
  if (
    !projectBitJson.dependencies ||
    R.isEmpty(projectBitJson.dependencies) ||
    !componentsMap ||
    R.isEmpty(componentsMap)
  ) return [];

  const bitJsonComponents = projectBitJson.getDependenciesArray();
  const componentsOnFS = Object.keys(componentsMap);
  const components = componentsOnFS.filter(component => bitJsonComponents.includes(component));
  const componentDependencies = findAllDependenciesInComponentMap(componentsMap, bitJsonComponents);
  return R.uniq(components.concat(componentDependencies));
}

function generateDependenciesP(targetComponentsDir: string, map: Object, components: string[]) {
  return new Promise((resolve, reject) => {
    const promises = [];

    components.forEach((component) => {
      const targetModuleDir = path.join(
        targetComponentsDir,
        map[component].loc,
        MODULES_DIR,
        MODULE_NAME,
      );

      map[component].dependencies.forEach((dependency) => {
        if (!map[dependency]) return; // the dependency is not in the FS. should we throw an error?
        const [namespace, name] = map[dependency].loc.split(path.sep);
        const targetFile = path.join(targetModuleDir, namespace, name, INDEX_JS);
        const relativeComponentsDir = path.join(...Array(8).fill('..'));
        const dependencyDir = path.join(
          relativeComponentsDir,
          map[dependency].loc,
          map[dependency].file,
        );

        promises.push(writeFileP(targetFile, linkTemplate(dependencyDir)));
      });
    });
    Promise.all(promises).then(() => resolve(map)).catch(reject);
  });
}

export function dependencies(
  targetComponentsDir: string, map: Object, projectBitJson: BitJson,
): Promise<Object> {
  const components = filterNonReferencedComponents(map, projectBitJson);
  return generateDependenciesP(targetComponentsDir, map, components);
}

export function dependenciesForSpecificComponents(
  targetComponentsDir: string, map: Object, components: Object): Promise<Object> {
  return generateDependenciesP(targetComponentsDir, map, Object.keys(components));
}

function generateLinkP(targetModuleDir, namespace, name, map, id, sourceComponentsDir) {
  const targetDir = path.join(targetModuleDir, namespace, name, INDEX_JS);
  const relativeComponentsDir = path.join(...Array(4).fill('..'), sourceComponentsDir);
  const dependencyDir = path.join(relativeComponentsDir, map[id].loc, map[id].file);
  return writeFileP(targetDir, linkTemplate(dependencyDir));
}

export function publicApiForInlineComponents(
  targetModuleDir: string,
  inlineMap: Object,
): Promise<Object> {
  const components = {};
  if (!inlineMap || R.isEmpty(inlineMap)) return Promise.resolve(components);

  const writeAllFiles = Promise.all(Object.keys(inlineMap).map((id) => {
    const [namespace, name] = id.split(path.sep);
    components[`${namespace}/${name}`] = id;
    return generateLinkP(targetModuleDir, namespace, name, inlineMap,
      id, INLINE_COMPONENTS_DIRNAME);
  }));

  return writeAllFiles.then(() => components);
}

export function publicApiNamespaceLevel(
  targetModuleDir: string, namespacesMap: Object): Promise<Object> {
  if (!namespacesMap || R.isEmpty(namespacesMap)) return Promise.resolve(namespacesMap);
  const writeAllFiles = [];
  Object.keys(namespacesMap).forEach((namespace) => {
    const links = namespacesMap[namespace].map(name => `${camelcase(name)}: require('./${name}')`);
    const indexFile = path.join(targetModuleDir, namespace, INDEX_JS);
    writeAllFiles.push(writeFileP(indexFile, linksTemplate(links)));
  });

  return Promise.all(writeAllFiles).then(() => namespacesMap);
}

export function publicApiRootLevel(
  targetModuleDir: string, namespacesMap: Object): Promise<*> {
  if (!namespacesMap || R.isEmpty(namespacesMap)) return Promise.resolve();
  const namespaces = Object.keys(namespacesMap);
  const links = namespaces.map(namespace => namespaceTemplate(namespace));
  const indexFile = path.join(targetModuleDir, INDEX_JS);
  return writeFileP(indexFile, linksTemplate(links));
}

export function publicApiForExportPendingComponents(
  targetModuleDir: string,
  map: Object,
): Promise<Object> {
  const components = {};
  const exportPendingComponents = Object.keys(map)
    .filter(component => map[component].isFromLocalScope === true);

  if (!exportPendingComponents.length) return Promise.resolve({ map, components });
  const writeAllFiles = exportPendingComponents.map((component) => {
    const [namespace, name] = map[component].loc.split(ID_DELIMITER);
    components[`${namespace}/${name}`] = component;
    return generateLinkP(targetModuleDir, namespace, name, map, component, COMPONENTS_DIRNAME);
  });
  return Promise.all(writeAllFiles).then(() => ({ map, components }));
}

export function publicApiComponentLevel(
  targetModuleDir: string,
  map: Object,
  projectBitJson: BitJson,
): Promise<Object> {
  const components = {};

  if (!projectBitJson.dependencies || R.isEmpty(projectBitJson.dependencies)) {
    return Promise.resolve(components);
  }

  const writeAllFiles = Object.keys(projectBitJson.dependencies).map((id) => {
    const [, namespace, name] = id.split(ID_DELIMITER);
    const mapId = id + VERSION_DELIMITER + projectBitJson.dependencies[id];
    if (!map[mapId]) return Promise.resolve(); // the file is in bit.json but not fetched yet
    components[`${namespace}/${name}`] = mapId;
    return generateLinkP(targetModuleDir, namespace, name, map, mapId, COMPONENTS_DIRNAME);
  });

  return Promise.all(writeAllFiles).then(() => components);
}

export function publicApiComponentLevelForSpecificComponents(
  targetModuleDir: string,
  map: Object,
  components: Object,
): Promise<Object> {
  const writeAllFiles = Object.keys(components).map((componentId) => {
    const component = components[componentId];
    const namespace = component.box;
    const name = component.name;
    const mapId = component.id;
    if (!map[mapId]) return Promise.resolve(); // the file is not in the FS for some reason
    return generateLinkP(targetModuleDir, namespace, name, map, mapId, COMPONENTS_DIRNAME);
  });

  return Promise.all(writeAllFiles).then(() => components);
}
