import './style.css';
import { AirConsole } from './airconsole-1.8.0.js';
import { Application, Graphics, Renderer, Text } from 'pixi.js';
function entry() {
    const ac = new AirConsole({
        orientation: AirConsole.ORIENTATION_LANDSCAPE,
    });
    const app = new Application({ autoDensity: true });
    const canvasEl = app.view as HTMLCanvasElement
    document.body.appendChild(canvasEl);
    // Resize
    const resizeRenderer = () => {
        const parent = app.view.parentNode as HTMLElement;
        app.renderer.resize(parent.clientWidth, parent.clientHeight);
    }
    resizeRenderer();
    window.addEventListener('resize', resizeRenderer);

    const circle = new Graphics();
    circle.beginFill(0xffffff).drawCircle(0, 0, 15).endFill();
    circle.x = app.view.width / 2;
    circle.y = app.view.height / 2;

    const line = new Graphics();
    line.lineStyle(4, 0xffffff).moveTo(0, 0).lineTo(0, 0);

    let isTouching = false;
    let startX = 0;
    let startY = 0;
    let touchX = 0;
    let touchY = 0;

    const calculatePosition = (event, element, pixelRatio) => {
        var elementBounds = element.getBoundingClientRect(),
            rootNode = (document.documentElement || document.body.parentNode || document.body),
            scrollX = (window.pageXOffset !== undefined) ? window.pageXOffset : rootNode.scrollLeft,
            scrollY = (window.pageYOffset !== undefined) ? window.pageYOffset : rootNode.scrollTop,
            touches = event.changedTouches,
            x, y;

        if (touches) {
            x = touches[0].pageX - elementBounds.left - scrollX;
            y = touches[0].pageY - elementBounds.top - scrollY;
        } else {
            x = event.pageX - elementBounds.left - scrollX;
            y = event.pageY - elementBounds.top - scrollY;
        }

        return {
            x: x / (element.clientWidth / (element.width || element.clientWidth) * pixelRatio),
            y: y / (element.clientHeight / (element.height || element.clientHeight) * pixelRatio)
        };
    };

    const send = (data: Object) => {
        ac.message(AirConsole.SCREEN, JSON.stringify(data));
    }
    const aimUpdate = (x: number, y: number) => {
        send({
            type: 'aimUpdate',
            x, y
        });
    };

    ac.onMessage = (_, data) => {
        const message = JSON.parse(data);
        switch (message.type) {
            case 'setColor':
                (app.renderer as Renderer).background.color = message.color;
                app.render();
                break;
            case 'resetAim':
                isTouching = false;
                break;
        }
    };

    const onTouchStart = (e: TouchEvent | MouseEvent) => {
        const position = calculatePosition(e, app.view, 1);

        isTouching = true;
        startX = touchX = circle.x = position.x
        startY = touchY = circle.y = position.y
        line
            .clear()
            .lineStyle(4, 0xff0000)
            .moveTo(startX, startY)
            .lineTo(touchX, touchY);
        app.stage.addChild(line, circle);
        aimUpdate(0, 0);
    }
    const onTouchMove = (e: TouchEvent | MouseEvent) => {
        const position = calculatePosition(e, app.view, 1);
        touchX = position.x
        touchY = position.y
        line
            .clear()
            .lineStyle(4, 0xff0000)
            .moveTo(startX, startY)
            .lineTo(touchX, touchY);
    }
    const onTouchEnd = () => {
        app.stage.removeChild(line, circle);
        isTouching = false;
    }

    canvasEl.addEventListener('touchstart', onTouchStart);
    canvasEl.addEventListener('touchmove', onTouchMove);
    canvasEl.addEventListener('touchend', onTouchEnd);
    canvasEl.addEventListener('mousedown', onTouchStart);
    canvasEl.addEventListener('mousemove', onTouchMove);
    canvasEl.addEventListener('mouseup', onTouchEnd);

    setInterval(() => {
        if (!isTouching) return;
        aimUpdate(startX - touchX, startY - touchY);
    }, 100);

}
entry();
