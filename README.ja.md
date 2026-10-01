# File in Image / 画像にファイルを埋め込む

[English README](README.md)

任意の1ファイルを画像の画素へ埋め込み、生成されたPNGからあとで元のファイルを取り出すブラウザーツールです。処理はブラウザー内で完結します。

> **現在の開発版:** v0.4.0。ここで使用するBKFI/BKFC形式は開発途中の形式で、v1の正式互換形式はまだ固定していません。

## Features

- キャリア画像: PNG / JPEG / WebP
- 埋め込むファイル: 任意の1ファイル、最大32 MiB
- 出力: PNG
- 任意のパスワード保護
- PBKDF2-HMAC-SHA-256 600,000回 + 16-byteランダムsalt
- AES-256-GCM + 12-byteランダムIV + 128-bit認証タグ
- パスワード保護時はファイル名・MIMEもファイル本体と一緒に暗号化
- BKFI outer header全体をAES-GCMの追加認証データとして検証
- BKFCコンテナ全体をGZIPし、実際に小さくなる場合だけ採用
- 暗号化タグを含めた実際の埋め込みサイズで容量判定
- 復元したファイルをSHA-256で確認
- 日本語 / 英語UI
- 実行時CDN・API・analytics・telemetry・ファイルアップロードなし
- `file://` 直接起動と単一HTML配布を前提

## パスワード保護

パスワード保護は任意です。有効にすると、BKFCコンテナを必要に応じてGZIPした後、inner body全体をAES-256-GCMで暗号化します。

パスワードは入力された文字列をそのままUTF-8化し、trimやUnicode normalizationは行いません。localStorageやIndexedDBには保存しません。

鍵導出に必要なiteration数、random salt、IVはBKFI headerへ保存します。これらは秘密情報ではありません。一方、BKFI header全体をAES-GCMのAADとして認証するため、認証対象のheaderが変更された場合も復号に失敗します。

パスワードが違う場合や認証対象データが変更されている場合、inner containerを開かずに失敗します。そのためパスワード保護した画像では、正しいパスワードなしに元のファイル名やMIMEを表示しません。

## GZIPについて

GZIPは暗号化前に行い、BKFC全体が実際に小さくなる場合だけ採用します。GZIPは容量を減らすための機能で、暗号化ではありません。

## 重要な注意

埋め込みデータは画像画素の最下位bitに保存されます。リサイズ、トリミング、画像編集、JPEG変換、非可逆WebP変換、スクリーンショット、SNSやメッセージアプリによる再圧縮などを行うと、埋め込んだファイルを取り出せなくなる場合があります。生成したPNGはそのまま保持してください。

v0.4.0では、高ディテール領域への適応埋め込みと生成PNGの自動復元確認はまだ実装していません。

## Privacy

ユーザーが選んだ画像、ファイル、パスワードはブラウザーのメモリ内で処理します。`connect-src 'none'` を維持し、実行時の外部通信へ依存しません。ファイル内容やパスワードをlocalStorageやIndexedDBへ保存しません。

## Development

現在の `htmlapps-template` の契約に準拠します。編集対象は `src/index.template.html` で、生成済み `dist` ファイルを直接編集しません。

Windowsでは次を実行します。

```bat
build-standalone.bat
```

## Browser support

現行のChrome / Edge / Firefox / Safari / Android Chrome / iOS Safariを対象とします。`file://` での直接起動も正式要件です。

## License

MIT
