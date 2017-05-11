import { bindAction, bindSpecificComponentsAction, watchAction, fetchAction, importAction } from './actions';

const lifecycleHooks = {
  onCreate: bindAction,
  onCommit: bindAction,
  onImport: bindAction,
  onExport: bindAction,
  onModify: bindAction,
};

module.exports = {
  lifecycleHooks,
  bind: bindAction,
  watch: watchAction,
  fetch: fetchAction,
  import: importAction,
  bindSpecificComponents: bindSpecificComponentsAction,
};
