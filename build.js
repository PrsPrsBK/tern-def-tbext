/**
 * @fileoverview anyway make tern-definition file.
 * @author PrsPrsBK
 */

const fs = require('fs');
const path = require('path');
const stripJsonComments = require('strip-json-comments');
const bcd = require('mdn-browser-compat-data').webextensions.api;

let mozillaRepo = '';
let commRepo = '';
let releaseChannel = 'nightly';
let goShrink = false;
const getOutputFileName = (prefix) => {
  return `${prefix}-${releaseChannel}.json`;
};
const mozillaApiGroups = [
  {
    prefix: 'webextensions-desktop',
    schemaDir: 'toolkit/components/extensions/schemas/',
    apiListFile: 'toolkit/components/extensions/ext-toolkit.json',
    resultBase: {
      '!name': 'tbext',
      '!define': {},
      'chrome': {
        '!type': '+browser',
      },
    },
    schemaList: [
      {
        name: 'events',
        schema: 'toolkit/components/extensions/schemas/events.json',
      },
      {
        name: 'types',
        schema: 'toolkit/components/extensions/schemas/types.json',
      },
    ],
  },
  {
    prefix: 'webextensions-desktop',
    schemaDir: 'browser/components/extensions/schemas/',
    apiListFile: 'browser/components/extensions/ext-browser.json',
    resultBase: {
      '!name': 'tbext',
      '!define': {},
      'chrome': {
        '!type': '+browser',
      },
    },
    schemaList: [],
  },
  //{
  //  prefix: 'webextensions-desktop',
  //  schemaDir: 'mobile/android/components/extensions/schemas/',
  //  schemaList: [
  //    {
  //      name: 'browserAction',
  //      schema: 'browser/components/extensions/schemas/browser_action.json',
  //    },
  //    {
  //      name: 'browsingData',
  //      schema: 'browser/components/extensions/schemas/browsing_data.json',
  //    },
  //    {
  //      name: 'pageAction',
  //      schema: 'browser/components/extensions/schemas/page_action.json',
  //    },
  //    {
  //      name: 'tabs',
  //      schema: 'browser/components/extensions/schemas/tabs.json',
  //    },
  //  ],
  //},
];
const commApiGroups = [
  {
    prefix: 'tbext',
    schemaDir: 'mail/components/extensions/schemas/',
    apiListFile: 'mail/components/extensions/ext-mail.json',
    resultBase: {
      '!name': 'tbext',
      '!define': {},
    },
    schemaList: [],
  },
];

/**
 * distill from argments.
 * @returns {Object} report
 */
const numerateArgs = () => {
  const report = {
    isValid: true,
    message: [],
  };
  process.argv.forEach((arg, idx) => {
    if(arg === '--repository') {
      if(idx + 1 < process.argv.length) {
        mozillaRepo = process.argv[idx + 1];
      }
      else {
        report.isValid = false;
        report.message.push(`please specify as --${arg} value`);
      }
    }
    else if(arg === '--comm-repo') {
      if(idx + 1 < process.argv.length) {
        commRepo = process.argv[idx + 1];
      }
      else {
        report.isValid = false;
        report.message.push(`please specify as --${arg} value`);
      }
    }
    else if(arg === '--channel') {
      if(idx + 1 < process.argv.length) {
        releaseChannel = process.argv[idx + 1];
      }
      else {
        report.isValid = false;
        report.message.push(`please specify as --${arg} value`);
      }
    }
    else if(arg === '--shrink') {
      goShrink = true;
    }
  });
};

/**
 * Check the structure of repository.
 * @param {string} rootDir root directory of repository
 * @returns {{isValid: boolean, message: string}} the repository has assumed dirs or not
 */
const checkRepositoryDirs = (rootDir, apiGroups) => {
  const report = {
    isValid: true,
    message: [],
  };
  if(rootDir === '') {
    report.isValid = false;
    report.message.push('Lack of arg: --mozilla-repo foo --comm-repo bar');
  }
  else if(fs.existsSync(rootDir) === false) {
    report.isValid = false;
    report.message.push(`root dir does not exist: ${rootDir}`);
  }
  else {
    apiGroups.forEach((aGroup) => {
      const schemaDirFull = path.join(rootDir, aGroup.schemaDir);
      if(fs.existsSync(schemaDirFull) === false) {
        report.isValid = false;
        report.message.push(`schema dir does not exist: ${aGroup.schemaDir}`);
      }
    });
  }
  return report;
};

const chromeUri2Path = (schemaDir, chromeUri) => {
  const regexSchemaPath = /.+\/([^/]+json)$/;
  //identity is in browser-ui api, and its schema is in toolkit dir. only-one case.
  if(chromeUri.startsWith('chrome://extensions/content/schemas/')) {
    return `toolkit/components/extensions/schemas/${regexSchemaPath.exec(chromeUri)[1]}`;
  }
  else if(chromeUri.startsWith('chrome://browser/content/schemas/')) {
    return `browser/components/extensions/schemas/${regexSchemaPath.exec(chromeUri)[1]}`;
  }
  if(chromeUri.startsWith('chrome://messenger/content/schemas/')) {
    return `${schemaDir}${regexSchemaPath.exec(chromeUri)[1]}`;
  }
  else {
    return '';
  }
};

const makeSchemaList = (rootDir, apiGroups) => {
  apiGroups.forEach((aGroup) => {
    if(aGroup.apiListFile !== undefined) {
      const apiListFileFull = path.join(rootDir, aGroup.apiListFile);
      const apiItemList = JSON.parse(stripJsonComments(fs.readFileSync(apiListFileFull, 'utf8')));
      for(const apiName in apiItemList) {
        if(apiItemList[apiName].schema !== undefined) { //only background page?
          const schema = chromeUri2Path(apiGroups.schemaDir, apiItemList[apiName].schema);
          if(schema !== '') {
            const apiItem = {
              name: apiName,
              schema,
            };
            aGroup.schemaList.push(apiItem);
          }
          else {
            console.log(`skiped: irregular path for ${apiName}. ${apiItemList[apiName].schema}`);
          }
        }
      }
    }
  });
};

const makeTernDefTree = (declaredAt, nameTree, curItem, options = {}) => {
  const isDefZone = ('isDefZone' in options) ? options.isDefZone : false;
  const defZoneStep = ('defZoneStep' in options) ? options.defZoneStep : 0;

  const toTernAtom = (exprAtSchema) => {
    let ternAtom = exprAtSchema;
    if(exprAtSchema.type !== undefined) {
      if(exprAtSchema.type === 'boolean') {
        ternAtom = 'bool';
      }
      else if(exprAtSchema.type === 'integer') {
        ternAtom = 'number';
      }
      else if(exprAtSchema.type === 'any') {
        ternAtom = '?';
      }
      else if(exprAtSchema.type === 'array') { // array only exists in definition
        // array with choices may only in events.UrlFilter.ports
        // and "!type": "[number]?, [[number]]?" has no error...
        if(exprAtSchema.items.choices !== undefined) {
          const ternChoices = [];
          for(const cho of exprAtSchema.items.choices) {
            ternChoices.push(`[${toTernAtom(cho)}]?`);
          }
          ternAtom = `${ternChoices.join(', ')}`;
        }
        else {
          ternAtom = `[${toTernAtom(exprAtSchema.items)}]`;
        }
      }
      else if(exprAtSchema.type === 'function') {
        // you SHOULD TRIM param.name. 'fn( arg: string...)' result in error
        // and hard to notice.
        const paramArr = [];
        if(exprAtSchema.parameters !== undefined) {
          for(const param of exprAtSchema.parameters) {
            if(param.choices !== undefined) {
              for(const cho of param.choices) {
                paramArr.push(`${param.name.trim()}?: ${toTernAtom(cho)}`);
              }
            }
            else {
              const atomString = toTernAtom(param);
              // anyway avoid "!type": "object". [object] is not problemsome.
              paramArr.push(`${param.name.trim()}: ${atomString}`);
            }
          }
        }
        ternAtom = `fn(${paramArr.join(', ')})`;
      }
      else {
        ternAtom = exprAtSchema.type;
      }
    }
    else if(exprAtSchema.choices !== undefined) {
      //browserUI has purely choices
      const ternChoices = [];
      for(const cho of exprAtSchema.choices) {
        ternChoices.push(`[${toTernAtom(cho)}]?`);
      }
      ternAtom = `${ternChoices.join(', ')}`;
    }
    else if(exprAtSchema.value !== undefined) {
      ternAtom = 'number';
    }
    else if(exprAtSchema['$ref'] !== undefined) {
      if(exprAtSchema['$ref'].indexOf('.') !== -1) {
        ternAtom = `+${exprAtSchema['$ref']}`; // tabs.Tab or so
      }
      else {
        ternAtom = `+${declaredAt}.${exprAtSchema['$ref']}`;
      }
    }
    return ternAtom;
  };

  const result = {};
  if(curItem.description !== undefined) {
    result['!doc'] = curItem.description;
  }
  // top level can not have tern !type. knowing need for long hours.
  if(isDefZone === false || (isDefZone && defZoneStep > 0)) {
    const atomString = toTernAtom(curItem);
    // anyway avoid "!type": "object". [object] is not problemsome.
    if(atomString !== 'object') {
      result['!type'] = atomString;
    }
  }

  let bcdTree = bcd;
  for(const nd of nameTree) {
    if(bcdTree === undefined) {
      break;
    }
    bcdTree = bcdTree[nd];
  }
  if(bcdTree !== undefined) {
    if(bcdTree.__compat !== undefined) {
      result['!url'] = bcdTree.__compat.mdn_url;
    }
  }

  if(curItem.functions !== undefined) {
    for(const fun of curItem.functions) {
      result[fun.name] = makeTernDefTree(declaredAt, nameTree.concat(fun.name), fun, { isDefZone, defZoneStep: (defZoneStep + 1) });
    }
  }
  if(curItem.properties !== undefined) {
    for(const prop in curItem.properties) {
      result[prop] = makeTernDefTree(declaredAt, nameTree.concat(prop), curItem.properties[prop], { isDefZone, defZoneStep: (defZoneStep + 1) });
    }
  }
  return result;
};

const makeTernDefineZone = (declaredAt, nameTree, curItem) => {
  return makeTernDefTree(declaredAt, nameTree, curItem, { isDefZone: true, defZoneStep: 0});
};

const makeTernNonDefZone = (declaredAt, nameTree, curItem) => {
  return makeTernDefTree(declaredAt, nameTree, curItem, { isDefZone: false });
};

const build = (rootDir, apiGroups) => {
  makeSchemaList(rootDir, apiGroups);
  const result = apiGroups.resultBase;
  const browserObj = {};
  const ternDefineObj = {};
  //console.log('# used files at first published');
  apiGroups.forEach((aGroup) => {
    for(const schemaItem of aGroup.schemaList) {
      //console.log(` * ${schemaItem.schema}`);
      const schemaFileFull = path.join(rootDir, schemaItem.schema);
      try {
        const apiSpecList = JSON.parse(stripJsonComments(fs.readFileSync(schemaFileFull, 'utf8')));
        apiSpecList.forEach((apiSpec) => {
          // if namespace is 'manifest', Object.keys => ["namespace", "types"]
          // namespace is not common between files. except 'manifest'
          if(apiSpec.namespace !== 'manifest') {
            const ternApiObj = {};
            if(apiSpec.description !== undefined) {
              ternApiObj['!doc'] = apiSpec.description;
            }

            //privacy.xxx, devtools.xxx.... not match tern and not go straight with compat-table
            const nameTreeTop = apiSpec.namespace.split('.');

            if(apiSpec.types !== undefined) { // !define is common in specific apiGroup
              for(const typ of apiSpec.types) {
                const curDefObj = makeTernDefineZone(apiSpec.namespace, nameTreeTop.concat(typ.id), typ);
                if(Object.keys(curDefObj).length !== 0) {
                  ternDefineObj[`${apiSpec.namespace}.${typ.id}`] = curDefObj;
                }
              }
            }

            if(apiSpec.functions !== undefined) {
              for(const fun of apiSpec.functions) {
                ternApiObj[fun.name] = makeTernNonDefZone(apiSpec.namespace, nameTreeTop.concat(fun.name), fun);
              }
            }
            if(apiSpec.events !== undefined) {
              for(const evt of apiSpec.events) {
                ternApiObj[evt.name] = makeTernNonDefZone(apiSpec.namespace, nameTreeTop.concat(evt.name), evt);
              }
            }
            if(apiSpec.properties !== undefined) {
              for(const prop in apiSpec.properties) {
                ternApiObj[prop] = makeTernNonDefZone(apiSpec.namespace, nameTreeTop.concat(prop), apiSpec.properties[prop]);
              }
            }

            if(nameTreeTop.length === 1) {
              browserObj[apiSpec.namespace] = ternApiObj;
            }
            else {
              //console.log(`  namespace contains dot ${apiSpec.namespace}`);
              browserObj[nameTreeTop[0]][nameTreeTop[1]] = ternApiObj; // length 2 is maybe enough
            }
          }
        });
      } catch(err) {
        // e.g. comm-central does not have a file for pkcs11, so fs.readFileSync() fails.
        console.log(`Schema Name: ${schemaItem.name}: ${err}`);
      }
    }
  });
  result['!define'] = ternDefineObj;
  result.browser = browserObj;
  if(fs.existsSync('defs') === false) {
    fs.mkdir('defs');
  }
  if(goShrink) {
    fs.writeFileSync(`defs/${getOutputFileName(apiGroups.prefix)}`, JSON.stringify(result));
  }
  else {
    fs.writeFileSync(`defs/${getOutputFileName(apiGroups.prefix)}`, JSON.stringify(result, null, 2));
  }
};

const isInvalidEnv = (report) => {
  if(report.isValid) {
    return false;
  }
  else {
    report.message.forEach(m => {
      console.log(m);
    });
    return true;
  }
};

const program = () => {
  if(isInvalidEnv(numerateArgs())) {
    return;
  }
  else if(isInvalidEnv(checkRepositoryDirs(mozillaRepo, mozillaApiGroups))) {
    return;
  }
  else if(isInvalidEnv(checkRepositoryDirs(commRepo, commApiGroups))) {
    return;
  }
  build(mozillaRepo, mozillaApiGroups);
  build(commRepo, commApiGroups);
};

program();

// vim:expandtab ff=unix fenc=utf-8 sw=2
