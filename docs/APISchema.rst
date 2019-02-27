========================================
About 'pick up this schema file or not'
========================================

We need to know about following APIs.

* accounts
* addressBooks
* browserAction
* cloudFile
* commands
* compose
* composeAction
* contacts
* legacy
* mailingLists
* mailTabs
* menus
* messages
* tabs
* windows

API has own manifest. 
I looked into referenced files, that is, manifest, API list, and each schema files.
And picked up one seemed necessary.

* Manifest File: ``mail/components/extensions/extensions-mail.manifest``
* API List File: ``mail/components/extensions/ext-mail.json``
* Schema Files: ``mail/components/extensions/schemas/*.json``
* File Location corresponds to URI: ``jar.mn``

----------------------------------------
Manifest File
----------------------------------------

.. code-block:: console

  category webextension-modules mail chrome://messanger/content/ext-mail.json
  category webextension-scripts      c-mail chrome://messanger/content/parent/ext-mail.js
  category webextension-scripts-addon mail chrome://messanger/content/child/ext-mail.js

* mail/components/extensions/extensions-mail.manifest
  * ext-mail.json
  * parent/ext-mail.js has no registerModules()
  * child/ext-mail.js has registerModules()
    menus, menusChild, tabs

----------------------------------------
API List File
----------------------------------------

You can get URIs of schema json files.
Each entry has some members.

* url - ``chrome://ext-*.js``
  ``menusChild`` has nothing. (but manifest has ``child/ext-mail.js``)
* schema - ``chrome://*.json``
* scopes

  * ``cloudFile`` has addon_parent, content_parent.
  * ``menusChild`` has addon_child, content_child, devtools_child.
  * others have addon_parent.

* paths - maybe namespace ``browser.foo``.

  * ``addressBook`` has addressBooks contacts mailingLists
  * ``legacy`` ``menusChild`` has nothing.

* manifest - maybe key of manifest, for
  ``browserAction``
  ``cloudFile``
  ``commands``
  ``composeAction``
  ``legacy``
  ``mailTabs``
  ``messages``

----------------------------------------
jar.mn
----------------------------------------

You can know which file each URI in ext-mail.json points.

Almost ``content/messenger/schemas/foo.json`` corresponds to ``./schemas/foo.json``.
pkcs11 corresoponds to ``../../../../browser/components/extensions/schemas/pkcs11.json``.

That is, you need mozilla-central or so.

----------------------------------------
Common with Firefox
----------------------------------------

I know from Read the Docs:
`Thunderbird WebExtension APIs <https://thunderbird-webextensions.readthedocs.io/en/latest/index.html>`__ .

* contentScripts
* experiments
* extension
* i18n
* management
* permissions
* pkcs11
* runtime
* theme

.. 
  vim:expandtab ff=unix fenc=utf-8 sw=2
