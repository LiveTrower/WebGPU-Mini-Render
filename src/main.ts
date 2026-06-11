import { App } from "./control/app";

const canvas : HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("gfx-main");

async function startApp() {
    const app = new App(canvas);

    try {
        await app.InitializeRenderer();
        app.minimizeMaximizeCard();
        
        app.run(); 
    } catch (error) {
        console.error("Error durante la inicialización:", error);
    }
}

startApp();