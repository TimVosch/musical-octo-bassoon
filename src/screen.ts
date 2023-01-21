import './style.css'
// import { AirConsole } from './airconsole-1.8.0.js';
import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { createWorld, Types, defineComponent, defineQuery, exitQuery, enterQuery, addEntity, addComponent, removeEntity } from 'bitecs';
import { Bodies,  Engine as PhysicsEngine, Render as PhysicsRender, Body, World } from 'matter-js'
import AssetBear from './assets/bear.png';
import { AirConsole } from './airconsole-1.8.0';

interface WorldProps {
    delta: number;
    airconsole: AirConsole;
}

//
// Renderer variables
//
enum Tex {
    Bear = 0,
}
const TexPath = {
    [Tex.Bear]: AssetBear,
}
const textureCache = new Map<Tex, Texture>();
function getTexture(id: Tex): Texture {
    if (!textureCache.has(id)) {
        const texture = Texture.from(TexPath[id])
        textureCache.set(id, texture);
        return texture;
    }
    return textureCache.get(id)!
}

//
// Components
//
const CPosition = defineComponent({ x: Types.f32, y: Types.f32 })
const CTexture = defineComponent({ tex: Types.i8 })
const CCircle = defineComponent({ radius: Types.f32, color: Types.ui32 })
const CPhysics = defineComponent({});
const CAim = defineComponent({ x: Types.f32, y: Types.f32 });
const CImpulseTimer = defineComponent({ left: Types.f32, interval: Types.f32 });

//
// Systems
//
function createRenderSystem(stage: Container) {
    const renderSprites = new Map<number, Sprite>();
    const renderQuery = defineQuery([CPosition, CTexture])
    const renderEnterQuery = enterQuery(renderQuery)
    const renderExitQuery = exitQuery(renderQuery)

    return (world: WorldProps) => {
        const entered = renderEnterQuery(world)
        for (let i = 0; i < entered.length; i++) {
            const id = entered[i];
            const texture = getTexture(CTexture.tex[id])
            const sprite = new Sprite(texture)
            stage.addChild(sprite);
            renderSprites.set(id, sprite)
            console.log("[RenderSystem] Created sprite: ", id)
        }

        const entities = renderQuery(world);
        for (let i = 0; i < entities.length; i++) {
            const id = entities[i];
            const sprite = renderSprites.get(id)
            if (!sprite) continue;
            sprite.x = CPosition.x[id]
            sprite.y = CPosition.y[id]
        }

        const exited = renderExitQuery(world)
        for (let i = 0; i < exited.length; i++) {
            const id = exited[i];
            const sprite = renderSprites.get(id)!
            stage.removeChild(sprite);
            renderSprites.delete(id);
        }
    }
}

const bodies = new Map<number, Body>();
function createPhysicsSystem() {
    const physicsQuery = defineQuery([CPosition, CPhysics, CCircle])
    const physicsEnterQuery = enterQuery(physicsQuery)
    const physicsExitQuery = exitQuery(physicsQuery)

    return (world: WorldProps, engine: PhysicsEngine) => {
        const entered = physicsEnterQuery(world);
        for (let i = 0; i < entered.length; i++) {
            const id = entered[i];
            const body = Bodies.circle(
                CPosition.x[id],
                CPosition.y[id],
                CCircle.radius[id],
                {
                    mass: 20,
                    restitution: 0.7,
                    frictionAir: 0.02,
                }
            )
            World.add(engine.world, body)
            console.log(`[PhysicsSystem] Added circle body (id: ${body.id}) for entity ${id} `);
            bodies.set(id, body);
        }

        const exited = physicsExitQuery(world);
        for (let i = 0; i < exited.length; i++) {
            const id = exited[i];
            World.remove(engine.world, bodies.get(id)!)
        }

        PhysicsEngine.update(engine, world.delta * 1000);

        const entities = physicsQuery(world);
        for (let i = 0; i < entities.length; i++) {
            const id = entities[i]
            const body = bodies.get(id)!;
            CPosition.x[id] = body.position.x;
            CPosition.y[id] = body.position.y;
        }
    };
}

function createCircleRenderer(stage: Container) {
    const renderGraphics = new Map<number, Graphics>();
    const renderQuery = defineQuery([CPosition, CCircle])
    const renderEnterQuery = enterQuery(renderQuery)
    const renderExitQuery = exitQuery(renderQuery)

    return (world: WorldProps) => {
        const entered = renderEnterQuery(world)
        for (let i = 0; i < entered.length; i++) {
            const id = entered[i];
            const circle = new Graphics()
            circle.beginFill(CCircle.color[id])
            circle.drawCircle(
                0, 0,
                CCircle.radius[id],
            )
            circle.endFill()
            circle.x = CPosition.x[id]
            circle.y = CPosition.y[id]
            stage.addChild(circle);
            renderGraphics.set(id, circle)
            console.log("[CircleRenderer] Created graphics: ", id)
        }

        const entities = renderQuery(world);
        for (let i = 0; i < entities.length; i++) {
            const id = entities[i];
            const sprite = renderGraphics.get(id)
            if (!sprite) continue;
            sprite.x = CPosition.x[id]
            sprite.y = CPosition.y[id]
        }

        const exited = renderExitQuery(world)
        for (let i = 0; i < exited.length; i++) {
            const id = exited[i];
            const sprite = renderGraphics.get(id)!
            stage.removeChild(sprite);
            renderGraphics.delete(id);
            console.log("[CircleRenderer] Removed graphics: ", id);
        }
    }
}

function createAimSystem(stage: Container) {
    const renderGraphics = new Map<number, Graphics>();
    const renderQuery = defineQuery([CPosition, CAim])
    const renderEnterQuery = enterQuery(renderQuery)
    const renderExitQuery = exitQuery(renderQuery)

    return (world: WorldProps) => {
        const entered = renderEnterQuery(world)
        for (let i = 0; i < entered.length; i++) {
            const id = entered[i];
            const aimLine = new Graphics()
                .lineStyle(5, 0xff0000)
                .moveTo(CPosition.x[id], CPosition.y[id])
                .lineTo(
                    CPosition.x[id] + CAim.x[id],
                    CPosition.y[id] + CAim.y[id],
                )
            stage.addChild(aimLine);
            renderGraphics.set(id, aimLine)
            console.log("[Aim] Created aimLine: ", id)
        }

        const entities = renderQuery(world);
        for (let i = 0; i < entities.length; i++) {
            const id = entities[i];
            const aimLine = renderGraphics.get(id)
            if (!aimLine) continue;
            aimLine
                .clear()
                .lineStyle(5, 0xff0000)
                .moveTo(CPosition.x[id], CPosition.y[id])
                .lineTo(
                    CPosition.x[id] + CAim.x[id],
                    CPosition.y[id] + CAim.y[id],
                )
        }

        const exited = renderExitQuery(world)
        for (let i = 0; i < exited.length; i++) {
            const id = exited[i];
            const aimLine = renderGraphics.get(id)!
            stage.removeChild(aimLine);
            renderGraphics.delete(id);
            console.log("[Aim] Removed aimLine: ", id);
        }
    }
}

function createImpulseSystem() {
    // Entities needed to be pushed
    const subjectQuery = defineQuery([CPhysics, CAim])
    // The director state
    const timerQuery = defineQuery([CImpulseTimer])
    return (world: WorldProps) => {
        const directors = timerQuery(world);
        if (directors.length > 1) {
            console.warn("[Impulse] Only one impulse timer should exist!")
        } else if (directors.length == 0) {
            return
        }

        const director = directors[0];
        CImpulseTimer.left[director] -= world.delta;

        // Leave if there is still time left
        if (CImpulseTimer.left[director] > 0) {
            return;
        }

        // Trigger impulses
        const subjects = subjectQuery(world);
        for (let i = 0; i < subjects.length; i++) {
            const id = subjects[i];
            const body = bodies.get(id)
            if (!body) continue;
            const dv = { x: CAim.x[id] / 300, y: CAim.y[id] / 300 }
            Body.applyForce(body, body.position, dv);
            console.log("[Impulse] Applying force (entity, force): ", { entity: id, body: body.id, force: dv });
            CAim.y[id] = CAim.x[id] = 0;
        }

        world.airconsole.broadcast(JSON.stringify({type:"resetAim"}))

        // Reset timer
        let interval = CImpulseTimer.interval[director]
        interval = Math.max(1, interval * 0.95);
        CImpulseTimer.left[director] = CImpulseTimer.interval[director] = interval;
    };
}

function createDebugSystem(stage: Container, director: number) {
    const text = new Text("");
    stage.addChild(text);

    return () => {
        text.text = `Time: ${CImpulseTimer.left[director].toFixed(2)}`
    }
}

//
// Prefabs
//
function createPlayer(world: WorldProps): number {
    const player = addEntity(world);
    addComponent(world, CCircle, player);
    addComponent(world, CPosition, player);
    addComponent(world, CPhysics, player);
    addComponent(world, CAim, player);
    CCircle.radius[player] = 30;
    CCircle.color[player] = 0xff0000;
    CPosition.x[player] = Math.random() * 700
    CPosition.y[player] = Math.random() * 700
    CAim.x[player] = 0;
    CAim.y[player] = 0;
    return player;
}
function createDirector(world: WorldProps): number {
    const director = addEntity(world);
    addComponent(world, CImpulseTimer, director);
    CImpulseTimer.interval[director] = 3;
    return director;
}

function entry() {
    console.clear();
    //
    // Create Game renderer
    //
    // Create app and append element to body
    const app = new Application({ autoDensity: true, background: '#1099bb', antialias: true });
    document.body.appendChild(app.view as HTMLCanvasElement);

    // Resize
    const parent = app.view.parentNode as HTMLElement;
    app.renderer.resize(parent.clientWidth, parent.clientHeight);

    //
    // Create physics engine
    //
    const pEngine = PhysicsEngine.create();
    pEngine.gravity.y = 0;
    const usePhysicsRenderOverlay = false;
    if (usePhysicsRenderOverlay) {
        const pRender = PhysicsRender.create({
            engine: pEngine,
            element: document.getElementById("debugcanvas")!,
            options: {
                width: parent.clientWidth,
                height: parent.clientHeight,
                background: 'transparent',
                wireframes: false,
                showAngleIndicator: true,
            },
        });
        PhysicsRender.run(pRender)
    }

    //
    // Create ECS
    //
    const world = createWorld<WorldProps>();
    world.delta = 0;

    const renderSystem = createRenderSystem(app.stage);
    const physicsSystem = createPhysicsSystem();
    const circleRenderSystem = createCircleRenderer(app.stage);
    const aimSystem = createAimSystem(app.stage)
    const impulseSystem = createImpulseSystem();

    const director = createDirector(world);
    const debugSystem = createDebugSystem(app.stage, director);

    const playerEntity = new Map<number, number>();
    const ac = world.airconsole = new AirConsole({});
    ac.onConnect = (id) => {
        const entity = createPlayer(world);
        CCircle.color[entity] = Math.random() * 0xffffff;
        ac.message(id, JSON.stringify({ type: "setColor", color: CCircle.color[entity] }))
        playerEntity.set(id, entity);
        console.log(`[AirConsole] New player, device_id: ${id}, entity: ${entity}`);
    };
    ac.onDisconnect = (id) => {
        console.log("Player disconnect: ", id)
        removeEntity(world, playerEntity.get(id)!)
    };
    ac.onMessage = (id, data) => {
        const e = playerEntity.get(id)!;
        if (!e) return;
        const payload = JSON.parse(data);

        switch (payload.type) {
            case 'aimUpdate':
                CAim.x[e] = payload.x
                CAim.y[e] = payload.y
                break
        }
    }

    let lastTime = performance.now();
    function update() {
        const delta = (performance.now() - lastTime) / 1000;
        world.delta = delta;

        // Mutating systems
        aimSystem(world);
        impulseSystem(world);

        // Simulation systems
        physicsSystem(world, pEngine);

        // Rendering systems
        renderSystem(world);
        circleRenderSystem(world);
        debugSystem();

        lastTime = performance.now();
        requestAnimationFrame(() => update());
    }
    update();

}
entry();
