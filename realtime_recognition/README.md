## フロントエンドのビルド結果をバックエンドに配置
```
cd realtime_recognition
cd frontend
npm run build
```

## FastAPI実行
```
cd realtime_recognition/
uvicorn backend.app.main:app --reload
```