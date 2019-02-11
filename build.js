/**
 * @fileoverview anyway make tern-definition file.
 * @author PrsPrsBK
 */

const fs = require('fs');
const path = require('path');
const stripJsonComments = require('strip-json-comments');

let repositoryDir = '';
let releaseChannel = 'nightly';
let isPublish = false;
const getOutputFileName = () => {
  return `tbext-${releaseChannel}.json`;
};
const apiGroups = [
  {
    outputName: `tbext-general-${releaseChannel}.json`,
    schemaDir: 'mail/components/extensions/schemas/',
    apiListFile: 'mail/components/extensions/ext-mail.json',
    schemaList: [],
  },
];

const processArgs = () => {
  process.argv.forEach((arg, idx, a) => {
    if(arg === '--repository') {
      repositoryDir = process.argv[idx + 1];
    }
    else if(arg === '--channel') {
      releaseChannel = process.argv[idx + 1];
    }
    else if(arg === '--publish') {
      isPublish = true;
    }
  });
  if(repositoryDir === '') {
    console.log('please specify: npm run build -- --repo /path/to/foo-repository-path');
    return false;
  }
  else {
    return true;
  }
};

const hasDirs = () => {
  let notError = true;
  if(fs.existsSync(repositoryDir) === false) {
    console.log(`repository ${repositoryDir} does not exists.`);
    notError = false;
  }
  else {
    apiGroups.forEach((aGroup) => {
      const schemaDirFull = path.join(repositoryDir, aGroup.schemaDir);
      if(fs.existsSync(schemaDirFull) === false) {
        console.log(`repository does not have ${aGroup.schemaDir} directory.`);
        notError = false;
      }
    });
  }
  return notError;
};

const chromeUri2Path = (chromeUri) => {
  const regexSchemaPath = /.+\/([^/]+json)$/;
  //identity is in browser-ui api, and its schema is in toolkit dir. only-one case.
  if(chromeUri.startsWith('chrome://messenger/content/schemas/')) {
    return `mail/components/extensions/schemas/${regexSchemaPath.exec(chromeUri)[1]}`;
  }
  else {
    return '';
  }
};

const makeSchemaList = () => {
  apiGroups.forEach((aGroup) => {
    if(aGroup.apiListFile !== undefined) {
      const apiListFileFull = path.join(repositoryDir, aGroup.apiListFile);
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

const build = () => {
  makeSchemaList();
  const result = {
    '!name': 'tbext',
    '!define': {},
  };
  const browserObj = {};
  const ternDefineObj = {};
  //console.log('# used files at first published');
  apiGroups.forEach((aGroup) => {
    for(const schemaItem of aGroup.schemaList) {
      //console.log(` * ${schemaItem.schema}`);
      const schemaFileFull = path.join(repositoryDir, schemaItem.schema);
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
        console.log(`Schema Name: ${schemaItem.name}: ${err}`);
      }
    }
  });
  result['!define'] = ternDefineObj;
  result.browser = browserObj;
  if(fs.existsSync('defs') === false) {
    fs.mkdir('defs');
  }
  if(isPublish) {
    fs.writeFileSync(`defs/${getOutputFileName()}`, JSON.stringify(result));
  }
  else {
    fs.writeFileSync(`defs/${getOutputFileName()}`, JSON.stringify(result, null, 2));
  }
};

if(processArgs() === false) {
  return;
}
if(hasDirs()) {
  build();
}

// vim:expandtab ff=unix fenc=utf-8 sw=2
