const userHome = require('user-home');
const path = require('path');

const getDirectory = () => {
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, 'Bit');
  }

  return path.join(userHome, '.bit');
};

const getCacheDirectory = () => {
  if (process.platform === 'darwin') {
    return path.join(userHome, 'Library', 'Caches', 'Bit');
  }

  return getDirectory();
};

/**
 * cache root directory
 */
export const CACHE_ROOT = getCacheDirectory();

export const BITS_DIRNAME = 'components';

export const INLINE_BITS_DIRNAME = 'inline_components';

export const BIT_JSON_NAME = 'bit.json';

export const SCOPE_JSON_NAME = 'scope.json';

export const LATEST_VERSION = 'latest';

export const COMPONENTS_DIRNAME = 'components';

export const INLINE_COMPONENTS_DIRNAME = 'inline_components';

export const DEFAULT_BOXNAME = 'global';

export const VERSION_DELIMITER = '::';

export const ID_DELIMITER = '/';

export const NO_PLUGIN_TYPE = 'none';

export const DEFAULT_BUNDLE_FILENAME = 'dist.js';

export const DEFAULT_DIST_DIRNAME = 'dist';

export const MODULE_NAME = 'bit';

export const MODULES_DIR = 'node_modules';

export const DEFAULT_IMPL_NAME = 'impl.js';

export const DEFAULT_SPECS_NAME = 'spec.js';

export const DEFAULT_MISC_FILES = [];

export const DEFAULT_COMPILER_ID = NO_PLUGIN_TYPE;

export const DEFAULT_TESTER_ID = NO_PLUGIN_TYPE;

export const DEFAULT_DEPENDENCIES = {};

export const BIT_HIDDEN_DIR = '.bit';

export const INDEX_JS = 'index.js';
