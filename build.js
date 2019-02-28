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
const mozillaApi = {
  prefix: 'webextensions-desktop',
  resultBase: {
    '!name': 'webextensions',
    '!define': {},
    'chrome': {
      '!type': '+browser',
    },
  },
  groupList: [
    {
      schemaDir: 'toolkit/components/extensions/schemas/',
      apiListFile: 'toolkit/components/extensions/ext-toolkit.json',
      useMdn: true,
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
      schemaDir: 'browser/components/extensions/schemas/',
      apiListFile: 'browser/components/extensions/ext-browser.json',
      useMdn: true,
      schemaList: [],
    },
    // {
    //   prefix: 'webextensions-desktop',
    //   schemaDir: 'mobile/android/components/extensions/schemas/',
    //   schemaList: [
    //     {
    //       name: 'browserAction',
    //       schema: 'browser/components/extensions/schemas/browser_action.json',
    //     },
    //     {
    //       name: 'browsingData',
    //       schema: 'browser/components/extensions/schemas/browsing_data.json',
    //     },
    //     {
    //       name: 'pageAction',
    //       schema: 'browser/components/extensions/schemas/page_action.json',
    //     },
    //     {
    //       name: 'tabs',
    //       schema: 'browser/components/extensions/schemas/tabs.json',
    //     },
    //   ],
    // },
  ]
};
const commApi = {
  prefix: 'tbext',
  resultBase: {
    '!name': 'tbext',
    '!define': {},
  },
  groupList: [
    {
      schemaDir: 'mail/components/extensions/schemas/',
      apiListFile: 'mail/components/extensions/ext-mail.json',
      useMdn: false,
      schemaList: [],
    },
    {
      //dummy
      schemaDir: 'mail/',
      // apiListFile: '',
      useMdn: true,
      schemaList: [
        {
          name: 'contentScripts',
          schema: '../toolkit/components/extensions/schemas/content_scripts.json',
        },
        {
          name: 'experiments',
          schema: '../toolkit/components/extensions/schemas/experiments.json',
        },
        {
          name: 'extension',
          schema: '../toolkit/components/extensions/schemas/extension.json',
        },
        {
          name: 'extension_protocol_handlers',
          schema: '../toolkit/components/extensions/schemas/extension_protocol_handlers.json',
        },
        {
          name: 'extension_types',
          schema: '../toolkit/components/extensions/schemas/extension_types.json',
        },
        {
          name: 'i18n',
          schema: '../toolkit/components/extensions/schemas/i18n.json',
        },
        {
          name: 'management',
          schema: '../toolkit/components/extensions/schemas/management.json',
        },
        {
          name: 'permissions',
          schema: '../toolkit/components/extensions/schemas/permissions.json',
        },
        {
          name: 'pkcs11',
          schema: '../browser/components/extensions/schemas/pkcs11.json',
        },
        {
          name: 'runtime',
          schema: '../toolkit/components/extensions/schemas/runtime.json',
        },
        {
          name: 'theme',
          schema: '../toolkit/components/extensions/schemas/theme.json',
        },
      ],
    },
  ],
};

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
    if(arg === '--mozilla-repo') {
      if(idx + 1 < process.argv.length) {
        mozillaRepo = process.argv[idx + 1];
      }
      else {
        report.isValid = false;
        report.message.push(`please specify as ${arg} somevalue`);
      }
    }
    else if(arg === '--comm-repo') {
      if(idx + 1 < process.argv.length) {
        commRepo = process.argv[idx + 1];
      }
      else {
        report.isValid = false;
        report.message.push(`please specify as ${arg} somevalue`);
      }
    }
    else if(arg === '--channel') {
      if(idx + 1 < process.argv.length) {
        releaseChannel = process.argv[idx + 1];
      }
      else {
        report.isValid = false;
        report.message.push(`please specify as ${arg} somevalue`);
      }
    }
    else if(arg === '--shrink') {
      goShrink = true;
    }
  });
  return report;
};

/**
 * Check the structure of repository.
 * @param {string} rootDir root directory of repository
 * @returns {{isValid: boolean, message: string}} the repository has assumed dirs or not
 */
const checkRepositoryDirs = (rootDir, apiBody) => {
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
    apiBody.groupList.forEach((aGroup) => {
      const schemaDirFull = path.join(rootDir, aGroup.schemaDir);
      if(fs.existsSync(schemaDirFull) === false) {
        report.isValid = false;
        report.message.push(`schema dir does not exist: ${aGroup.schemaDir}`);
      }
    });
  }
  return report;
};

const chromeUri2Path = (chromeUri) => {
  const regexSchemaPath = /.+\/([^/]+json)$/;
  //identity is in browser-ui api, but its schema is in toolkit dir. only-one case.
  if(chromeUri.startsWith('chrome://extensions/content/schemas/')) {
    return `toolkit/components/extensions/schemas/${regexSchemaPath.exec(chromeUri)[1]}`;
  }
  else if(chromeUri.startsWith('chrome://browser/content/schemas/')) {
    return `browser/components/extensions/schemas/${regexSchemaPath.exec(chromeUri)[1]}`;
  }
  else if(chromeUri.startsWith('chrome://messenger/content/schemas/')) {
    return `mail/components/extensions/schemas/${regexSchemaPath.exec(chromeUri)[1]}`;
  }
  else {
    return '';
  }
};

/**
 * Distill JSON file names from API schema file's content.
 * @param {string} rootDir 
 * @param {Object[]} apiGroups 
 */
const makeSchemaList = (rootDir, apiGroups) => {
  apiGroups.forEach((aGroup) => {
    if(aGroup.apiListFile !== undefined) {
      const apiListFileFull = path.join(rootDir, aGroup.apiListFile);
      const apiItemList = JSON.parse(stripJsonComments(fs.readFileSync(apiListFileFull, 'utf8')));
      for(const apiName in apiItemList) {
        if(apiItemList[apiName].schema !== undefined) { //only background page?
          const schema = chromeUri2Path(apiItemList[apiName].schema);
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

const makeTernDefTree = (declaredAt, nameTree, curItem, useMdn, options = {}) => {
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

  if(useMdn) {
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
  }

  if(curItem.functions !== undefined) {
    for(const fun of curItem.functions) {
      result[fun.name] = makeTernDefTree(declaredAt, nameTree.concat(fun.name), fun, useMdn, { isDefZone, defZoneStep: (defZoneStep + 1) });
    }
  }
  if(curItem.properties !== undefined) {
    for(const prop in curItem.properties) {
      result[prop] = makeTernDefTree(declaredAt, nameTree.concat(prop), curItem.properties[prop], useMdn, { isDefZone, defZoneStep: (defZoneStep + 1) });
    }
  }
  return result;
};

const makeTernDefineZone = (declaredAt, nameTree, curItem, useMdn) => {
  return makeTernDefTree(declaredAt, nameTree, curItem, useMdn, { isDefZone: true, defZoneStep: 0});
};

const makeTernNonDefZone = (declaredAt, nameTree, curItem, useMdn) => {
  return makeTernDefTree(declaredAt, nameTree, curItem, useMdn, { isDefZone: false });
};

const build = (rootDir, apiBody) => {
  const result = apiBody.resultBase;
  const apiGroups = apiBody.groupList;
  makeSchemaList(rootDir, apiGroups);
  const browserObj = {};
  const ternDefineObj = {};
  //console.log('# used files at first published');
  apiGroups.forEach((aGroup) => {
    const useMdn = aGroup.useMdn;
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
                const curDefObj = makeTernDefineZone(apiSpec.namespace, nameTreeTop.concat(typ.id), typ, useMdn);
                if(Object.keys(curDefObj).length !== 0) {
                  ternDefineObj[`${apiSpec.namespace}.${typ.id}`] = curDefObj;
                }
              }
            }

            if(apiSpec.functions !== undefined) {
              for(const fun of apiSpec.functions) {
                ternApiObj[fun.name] = makeTernNonDefZone(apiSpec.namespace, nameTreeTop.concat(fun.name), fun, useMdn);
              }
            }
            if(apiSpec.events !== undefined) {
              for(const evt of apiSpec.events) {
                ternApiObj[evt.name] = makeTernNonDefZone(apiSpec.namespace, nameTreeTop.concat(evt.name), evt, useMdn);
              }
            }
            if(apiSpec.properties !== undefined) {
              for(const prop in apiSpec.properties) {
                ternApiObj[prop] = makeTernNonDefZone(apiSpec.namespace, nameTreeTop.concat(prop), apiSpec.properties[prop], useMdn);
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
    fs.writeFileSync(`defs/${getOutputFileName(apiBody.prefix)}`, JSON.stringify(result));
  }
  else {
    fs.writeFileSync(`defs/${getOutputFileName(apiBody.prefix)}`, JSON.stringify(result, null, 2));
  }
};

const isValidEnv = (report) => {
  report.message.forEach(m => {
    console.log(m);
  });
  return report.isValid;
};

const program = () => {
  if(isValidEnv(numerateArgs()) === false) {
    return;
  }
  if(mozillaRepo !== '' && isValidEnv(checkRepositoryDirs(mozillaRepo, mozillaApi))){
    build(mozillaRepo, mozillaApi);
  }
  if(commRepo !== '' && isValidEnv(checkRepositoryDirs(commRepo, commApi))) {
    build(commRepo, commApi);
  }
};

program();

// vim:expandtab ff=unix fenc=utf-8 sw=2
