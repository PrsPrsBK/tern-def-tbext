# tern-def-tbext
![Screenshot](images/2018-04-12_readme-img_01.jpg)

 * WebExtensions definition files for [tern](http://ternjs.net/).
   * for completion
 * all things are rough.
 * not open online doc (MDN does not support Thunderbird extension.
   [comment](https://github.com/mdn/browser-compat-data/pull/2333#issuecomment-435333658))
 * [npm package](https://www.npmjs.com/package/tern-def-tbext) includes only definition-files.
   * data are made of comm-central repository.


## how to use with tern
I confirmed only with vim. install [tern-for-vim](https://github.com/ternjs/tern_for_vim) 
and add to project's `.tern-project` file.

```.tern-project
{
  "libs": [
    "browser",
    "path/to/tbext-nightly.json"
  ]
}
```

## make definition files

`npm run build -- --repository /path/to/local/repository`

This create 1 definition-file.

### use not nightly

In case of that you would like to use nightly.

`npm run build -- --repository /path/to/local/beta/repository --channel beta`

This create `tbext-beta.json`. 
`--channel` option only effects to filename. 
Using this option is for switching files specified within `.tern-project`. 
If you don't need to switch, there is no need for this option.


# License
MPL-2.0.

npm package includes json files. These contains contents which come from 
json schema files of comm-central repository. 
Some ones are under 3-Clause BSD License, others are under MPL-2.0 License. 
Both are in `License` directory.

[//]: # (vim:expandtab ff=unix fenc=utf-8 sw=2)
