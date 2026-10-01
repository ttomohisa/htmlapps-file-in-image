# File in Image / 画像にファイルを埋め込む

[English README](README.md)

任意の1ファイルを画像の画素へ埋め込み、生成されたPNGからあとで元のファイルを取り出すブラウザーツールです。処理はブラウザー内で完結します。

> **現在の開発版:** v0.6.0。BKFI/BKFC形式はまだ開発途中で、v1の正式互換形式は固定していません。

## Features

- PNG / JPEG / WebP画像を入力、PNGを出力
- 任意の1ファイル、最大32 MiB
- BKFC全体が小さくなる場合だけGZIP
- 任意のPBKDF2-HMAC-SHA-256 + AES-256-GCMパスワード保護
- 8×8ブロックの適応埋め込みとLSB非依存Sobel評価
- v0.2.0〜v0.4.0の旧sequential形式を復元可能
- v0.5.0のadaptive形式と互換
- 重い画像解析・埋め込み・抽出を単一HTML内のBlob Workerで処理
- 処理状況と進捗バー、キャンセル
- 入力変更時のgeneration tokenによるstale-result防止
- 復元ファイルをSHA-256で確認
- 日本語 / 英語UI
- 実行時CDN・API・analytics・telemetry・ファイルアップロードなし
- `file://` 直接起動と単一HTML配布を前提

## Worker処理

v0.6.0ではv0.5.0のファイル形式と適応配置アルゴリズムを変更せず、処理方法を改善しています。

適応画像解析、body埋め込み、適応抽出、旧形式のsequential body抽出を、単一HTML内に埋め込んだソースから生成するBlob Workerで実行します。

画像pixel bufferはWorker処理用に1つだけコピーし、そのArrayBufferをTransferableとして渡します。これにより大容量pixel dataのstructured cloneによる追加コピーを避けます。埋め込み時はWorkerへ渡したpixel bufferをその場で変更するため、Worker内でもう1枚分の出力画像コピーを作りません。

適応配置用のRGB slotは従来どおり、8×8ブロックごとに最大192件の一時bufferだけを使います。

Canvasによる画像decodeとPNG encodeはmain thread側に残します。

## 進捗とキャンセル

「埋め込む」「取り出す」の処理中は、現在の処理内容と進捗バー、キャンセルボタンを表示します。

Worker処理中にキャンセルした場合はWorkerを終了し、途中結果を破棄します。PBKDF2やPNG生成などブラウザー標準APIの非同期処理は途中停止できない場合がありますが、generation tokenを無効化するため、あとから完了しても結果を画面へ反映しません。

別の画像・ファイルを選び直した場合も古い処理を無効化し、古い結果が新しい結果を上書きしないようにします。

## 互換性

v0.6.0の新規出力形式はv0.5.0と同じです。

- `formatVersion=0`
- 新規出力は `embeddingMode=1`
- 旧 `embeddingMode=0` も復元可能

このバージョンではバイナリレイアウトや配置アルゴリズム自体は変更しません。

## 重要な注意

適応埋め込みでも画像編集への耐性はありません。リサイズ、トリミング、フィルター、JPEG/非可逆WebP変換、スクリーンショット、SNSやメッセージアプリによる再圧縮などで埋め込みデータは壊れる可能性があります。生成したPNGはそのまま保持してください。

v0.6.0では、生成PNGの自動復元確認はまだ実装していません。

## Privacy

画像、ファイル、パスワード、Workerへ渡すbuffer、復元データは端末内で処理します。`connect-src 'none'` を維持し、外部runtime依存は追加していません。

## Development

編集対象は `src/index.template.html` です。生成済み `dist` を直接編集しません。

```bat
build-standalone.bat
```

## License

MIT
