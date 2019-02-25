========================================
運用とその手順
========================================

この文書は何？
------------------

PowerShell スクリプトを使って更新作業と更新チェック作業をある程度楽にしています。
時間の経過とともに、tern定義ファイルに更新が必要かもしれない状況、
更新時の作業、更新が必要なかった時の対処、といったことを思い出しにくくなりました。
そのためメモを書きました。


更新するタイミング
--------------------

tern定義ファイルの内容は、 ``comm-central`` リポジトリから生成されています。

2019年02月現在、更新は不定期です。


毎日一回やること
------------------

毎日一回更新チェックスクリプトを手動で実行しています。
自動化して通知を送付させれば良いとも思いますが、このプロジェクトは
「やれる気持ちも時間もないなら終わり」というものであり、
「やれない」状態になった自分に通知だけが届き続けるのは虚しいので自動化していません。

更新チェックスクリプトによって、「npm ライブラリを更新する必要があるかもしれない」かどうかが判ります。


.. code-block:: console

  # スクリプト実行例
  # ver. 0.1.0まではmozilla-centralが調査対象に含まれていたためオプションで指定されています。後で直します。
  pwsh:$ D:\path\to\tern-def-tbext\daily-check.ps1 -MozillaRepo x:/path/to/mozilla-central -CommRepo x:/path/to/mozilla-central/comm
  25795:13f5e1afe5a3
  25796:f6c2b6ce1fd4
  ...

  # 更新が多い場合は次を表示する指示を入力させる状態になります。
  # S1000 とすれば1000行スキップできます。

  incomings may exist. hg pull -u? [y/n]: y
  https://hg.mozilla.org/comm-central/ から取り込み中
  変更点を探索中
  リビジョンを追加中
  マニフェストを追加中
  ファイルの変更を追加中
  23 個のリビジョン(108 の変更を 100 ファイルに適用)を追加
  新規リビジョン範囲 13f5e1afe5a3:5fa6fd01e555
  ファイルの更新数 100、 マージ数 0、 削除数 0、 衝突未解消数 0
  Next phase: check if we need to update or not.
  Result: no change added.

「更新の必要があるかもしれない」場合は、
まず ``cset.log`` と ``cset_pubed.log`` を比べて、コミットログのレベルで何が変更されたか見ます。
これは趣味なので飛ばしてもいいです。
また、リポジトリの履歴追跡に際しては 2つの ``manifest.json`` に注目しているのですが、
それぞれコミットログを3つしか記録していないので、
変更が多いときは最新の3つ以外は判りません。
続いてtern定義ファイルを作ります。

.. code-block:: console

  npm run build -- --mozilla-repo x:/path/to/mozilla-central --comm-repo x:/path/to/mozilla-central/comm

最後に ``npm publish`` した時点のものと ``diff`` を取って調べます。
違いがあればパッケージを作り直してアップロードします(次節参照)。
違いがなければ更新できないので、翌日以降の変更チェックを継続するための準備作業をします。
``cset_pubed.log`` を削除して現在の ``cset.log`` を残したまま ``cset_pubed.log`` に別名コピーします。
手順のこの部分は改善の余地があります。


更新するとき
------------------


tern定義ファイル生成
======================

まず先に生成したtern定義ファイルを名前変更しておきます。
今後の更新チェックで ``diff`` を取るために使います。

続いて定義ファイル生成です。
パッケージサイズを小さくするために ``--shrink`` を指定します。

.. code-block:: console

  npm run build -- --comm-repo x:/path/to/mozilla-central/comm --shrink



パッケージを作る
==================

まず ``package.json`` 記載のバージョンを更新します。

.. code-block:: console

  # publish の前にtgzを作って中身をチェックしています。
  # この時点ではdefs/which_is_used.txtが前回提出時のままです。
  pwsh:$ npm pack

  # これを実行したのちユーザ入力待ちになります。
  # d:/path/to/repository のように入力します。
  # mozilla-centralも調べる仕様になっていますが、後で直します。
  pwsh:$ npm publish

  cmdlet update-pub-status.ps1 at command pipeline position 1
  Supply values for the following parameters:
  MozillaRepo: x:/path/to/mozilla-central
  CommRepo: x:/path/to/mozilla-central/comm
  + tern-def-tbext@x.y.0


更新チェックスクリプトで違いがなかった場合は
``cset.log`` を残したまま ``cset_pubed.log`` に別名コピーしましたが、
パッケージを作成した場合は ``npm publish`` の過程で自動で処理されます。
パッケージ作成で失敗した場合はここがおかしくなるので、やはり手順に改善の余地があります。


パッケージを作った後
======================

一応githubにpushしています。tern定義ファイルはないですが。
あとtwitterでツイートしています。
ツイート以外の通知はしていません。

* `2019-02-25 22:19 PrsPrsBK <https://twitter.com/PrsPrsBK/status/1100022544852119552>`__
  : I published tern-definition file ver. 1.1.0 for Thunderbird Extension. Added - browser[.]compose `URL <https://www.npmjs.com/package/tern-def-tbext>`__

.. vim:expandtab ff=dos fenc=utf-8 sw=2
