## フロントエンド実行
```
cd realtime_recognition/frontend/
npm run dev
```
## バックエンド実行
```
poetry shell
cd realtime_recognition/
uvicorn backend.app.main:app --reload
```