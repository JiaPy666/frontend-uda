## avvia il vite
```
cd frontend-uda
```
```
npm install
```

## .env
-   Nello file .env deve mettere indirizzo ip del pc server
    per esempio 10.4.55.22

## per avviare
```
npm run dev
```

### se vogli avviare con https allora usa il comando
```
npm run dev:https
```

> ps: https funziona normamente nel ambiente locale ma se vogli aprire in altre parte, allore deve copiare la file rootCA.pem della pc del server e importare al browser in pc del destinatario, poi deve installare il mkcert, usa:
```
mkcert -install
```

- il file rootCA.pem si trova usando il comando:
```
mkcert -CAROOT
```

- il browser avvia con:
```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --proxy-bypass-list="*" --proxy-server="http://10.250.0.1:8080" --user-data-dir="C:\ChromeDevProfile"
```

