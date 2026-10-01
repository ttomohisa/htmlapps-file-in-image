# File in Image / 画像にファイルを埋め込む

[English README](README.md)

任意の1ファイルを画像の画素へ埋め込み、生成されたPNGからあとで元のファイルを取り出すブラウザーツールです。処理はブラウザー内で完結します。

> **リリース候補:** v0.9.0。新規出力は互換形式 version 1 を使用します。これまでの開発版で作った version 0 の画像も引き続き読み込めます。

## Features

- PNG / JPEG / WebP画像を入力、PNGを出力
- 任意の1ファイル、最大32 MiB
- BKFC全体が小さくなる場合だけGZIP
- 任意のPBKDF2-HMAC-SHA-256 + AES-256-GCMパスワード保護
- 8×8ブロックの適応埋め込み
- 進捗・キャンセル対応のBlob Worker処理
- 保存前の生成PNG自動復元確認
- 復元ファイルをSHA-256で確認
- パスワード表示 / 非表示
- 読み込み後も再ドロップ可能なコンパクトなファイル選択表示
- 日本語 / 英語UI
- 実行時CDN・API・analytics・telemetry・ファイルアップロードなし
- `file://` 直接起動と単一HTML配布を前提

## v0.9.0 互換形式候補

v0.9.0で新しく作る画像は、

- BKFI outer format version 1
- BKFC inner container version 1
- adaptive embedding mode 1

を使用します。

v0.2.0〜v0.8.0で作った version 0 画像も引き続き読み込めます。旧 sequential mode 0 と adaptive mode 1 の両方をdecode対象に残しています。

8×8適応配置、GZIP、PBKDF2/AES-GCM、80-byte BKFI header、48-byte BKFC fixed headerの意味は変更していません。

RC後にバイナリ仕様変更が必要な重大問題が見つかった場合は、version 1の意味を書き換えず、format versionを上げる方針です。

## 自動フォーマット回帰

`scripts/check-format-regression.mjs` をrepository checkへ追加しています。

CIで少なくとも、

- version 1の新規出力
- version 0/1のdecode
- 予約領域・未知flagsの拒否
- adaptive mode 1 round-trip
- legacy mode 0 decode

を確認します。

CIはNode.js 24を明示して実行します。

## RC手動確認

v1.0前には実ブラウザー・実端末での確認が必要です。

- `docs/RELEASE_CANDIDATE_CHECKLIST.ja.md`
- `docs/RELEASE_CANDIDATE_CHECKLIST.md`

にChrome / Edge / Firefox / Safari / Android Chrome / iOS Safari、日英、file://、暗号化、GZIP、旧形式復元、スマホUI、エラー状態などの確認項目をまとめています。

## 重要な注意

自動復元確認は「アプリが生成した直後のPNGから正常に復元できる」ことを確認する機能です。その後のリサイズ、トリミング、画像編集、JPEG/非可逆WebP変換、スクリーンショット、SNS等での再圧縮に対する耐性を付けるものではありません。

## Privacy

画像、ファイル、パスワード、Worker buffer、生成PNG、復元データは端末内で処理します。実行時通信は `connect-src 'none'` で遮断したままです。

## Development

編集対象は `src/index.template.html` です。生成済み `dist` を直接編集しません。

```bat
build-standalone.bat
```

repository check:

```powershell
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-repository.ps1
```

## License

MIT
