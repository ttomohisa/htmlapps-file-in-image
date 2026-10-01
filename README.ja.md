# File in Image / 画像にファイルを埋め込む

[English README](README.md)

任意の1ファイルを画像の画素へ埋め込み、生成されたPNGからあとで元のファイルを取り出すブラウザーツールです。処理はブラウザー内で完結します。

> **現在の開発版:** v0.7.0。BKFI/BKFC形式はまだ開発途中で、v1の正式互換形式は固定していません。

## Features

- PNG / JPEG / WebP画像を入力、PNGを出力
- 任意の1ファイル、最大32 MiB
- BKFC全体が小さくなる場合だけGZIP
- 任意のPBKDF2-HMAC-SHA-256 + AES-256-GCMパスワード保護
- 8×8ブロックの適応埋め込み
- キャンセル可能なBlob Worker処理
- 進捗表示とstale-result防止
- **保存前に生成PNGの自動復元確認を必須化**
- 復元ファイルをSHA-256で確認
- v0.2.0〜v0.6.0の開発形式を復元可能
- 日本語 / 英語UI
- 実行時CDN・API・analytics・telemetry・ファイルアップロードなし
- `file://` 直接起動と単一HTML配布を前提

## 生成PNGの自動復元確認

v0.7.0では、CanvasがPNGを生成しただけでは保存できません。

生成されたPNG Blobをもう一度通常の画像読み込み処理でデコードし、その画素からBKFI headerを読み直します。その後、通常の抽出Workerを使ってbodyを取り出し、実際の復元経路を通します。

パスワード保護ありの場合は、入力したパスワードとPNGから読み直したheaderを使ってPBKDF2をもう一度実行し、AES-256-GCMで認証・復号します。必要ならGZIPを展開し、BKFCを解析します。

復元したファイルのSHA-256、ファイル名、MIME、byte長が元ファイルと一致した場合だけ「PNGを保存」を有効にします。

生成前のImageDataだけを確認するのではなく、**実際にCanvasが出力したPNGそのもの**を確認します。

## 保存ロック

保存ボタンのdisabled状態に加えて、内部の `encodedVerified` フラグでも保存をガードします。確認失敗やキャンセル時に、保存可能な生成Blobをstateへ残しません。

パスワード保護ON/OFFやパスワード文字列を変更した場合も、それまでの生成結果・進行中の処理を無効化します。

## メモリ

自動復元確認では生成PNGを再デコードするためImageDataがもう1つ必要になります。この確認用ImageDataは再利用しないため、pixel ArrayBufferをそのまま抽出WorkerへTransferし、Worker送信用にさらに画像1枚分をコピーしない構成にしています。

元のキャリア画像は再試行できるよう保持します。

## 互換性

v0.7.0ではv0.5.0/v0.6.0のバイナリ形式・適応配置アルゴリズムを変更しません。

- `formatVersion=0`
- 新規出力は `embeddingMode=1`
- 旧 `embeddingMode=0` も復元可能

## 重要な注意

自動復元確認は「生成直後のPNGから正常に復元できる」ことを確認する機能です。その後の画像編集への耐性を付けるものではありません。リサイズ、トリミング、フィルター、JPEG/非可逆WebP変換、スクリーンショット、SNSやメッセージアプリによる再圧縮などで埋め込みデータは壊れる可能性があります。

## Privacy

画像、ファイル、パスワード、生成PNG、確認用bufferは端末内で処理します。`connect-src 'none'` を維持し、外部runtime依存は追加していません。

## Development

編集対象は `src/index.template.html` です。生成済み `dist` を直接編集しません。

```bat
build-standalone.bat
```

## License

MIT
