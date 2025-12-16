import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { initFirebase } from "./firebase";

async function bootstrap() {
    await initFirebase();

    const { default: App } = await import("./App"); // ✅ 여기로 이동

    ReactDOM.createRoot(document.getElementById("root")!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}

bootstrap();
