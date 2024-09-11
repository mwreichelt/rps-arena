import * as React from 'react';
import {ReactComponent as RockSVG} from "./Rock.svg";
import {ReactComponent as PaperSVG} from "./Paper.svg";
import {ReactComponent as ScissorsSVG} from "./Scissors.svg";

interface IRpsArenaProps {
    width: number,
    height: number,
    entityCount: number
}

interface IRpsEntity {
    index: number,
    x: number,
    dx: number,
    y: number,
    dy: number,
    type: number
}

// Return a random integer between min and max inclusively.
function rng(min: number, max: number): number {
    return Math.floor((Math.random() * 10 * max + min) % max);
}

function generateRpsEntities(count: number, width: number, height: number) {
    let ret: IRpsEntity[] = [];
    let nextType = 0;

    for(let i = 0; i < count; i++) {
        let x = rng(0, width - 35);
        let y = rng(0, height - 35);
        let type = nextType;//rng(1,3);
        nextType++;
        if(nextType === 3) {
            nextType = 0;
        }
        let dx = rng(0,10) < 5 ? -1 : 1;
        let dy = rng(0,10) < 5 ? -1 : 1;

        ret.push({
            index: i,
            x: x,
            y: y,
            dx: dx,
            dy: dy,
            type: type
        });
    }

    return ret;
}

function shakeRpsEntities(entities: IRpsEntity[]) {
    let updatedEntities: IRpsEntity[] = [];

    entities.forEach(entity => {
        updatedEntities.push({...entity, dx: rng(0,10) < 5 ? -1 : 1, dy: rng(0,10) < 5 ? -1 : 1});
    });

    return updatedEntities;
}

function speedUpEntities(entities: IRpsEntity[]) {
    let updatedEntities: IRpsEntity[] = [];

    entities.forEach(entity => {
        updatedEntities.push({...entity, dx: entity.dx * 2, dy:entity.dy * 2});
    });

    return updatedEntities;
}

function updateEntityPositions(entities: IRpsEntity[], width: number, height: number): IRpsEntity[] {
    let updatedEntities: IRpsEntity[] = [];

    entities.forEach(entity => {
        let newEntity = {...entity, x: entity.x + entity.dx, y: entity.y + entity.dy};
        if(newEntity.x <= 0 || newEntity.x + 32 >= width) {
            newEntity.dx = -newEntity.dx;
        }
        if(newEntity.y <= 0 || newEntity.y + 32 >= height) {
            newEntity.dy = -newEntity.dy;
        }
        newEntity.x = Math.max(newEntity.x, 0);
        newEntity.y = Math.max(newEntity.y, 0);
        newEntity.x = Math.min(newEntity.x, width);
        newEntity.y = Math.min(newEntity.y, height);
        updatedEntities.push(newEntity);
    });

    return updatedEntities;
}

function entitiesCollide(a: IRpsEntity, b:IRpsEntity): boolean {
    return a.x < b.x + 32 &&
        a.x + 32 > b.x &&
        a.y < b.y + 37 &&
        a.y + 37 > b.y;
}

function checkCollisions(entities: IRpsEntity[]): IRpsEntity[] {
    let updatedEntities: IRpsEntity[] = [];
    for(let outerIndex = 0; outerIndex < entities.length; outerIndex++) {
        let nextEntity = {...entities[outerIndex]};
        for(let innerIndex = outerIndex + 1; innerIndex < entities.length; innerIndex++) {
            if(entitiesCollide(entities[outerIndex], entities[innerIndex])) {
                if(entities[outerIndex].type !== entities[innerIndex].type) {
                    if((entities[outerIndex].type === 0 && entities[innerIndex].type === 1)
                        || (entities[outerIndex].type === 1 && entities[innerIndex].type === 2)
                        || (entities[outerIndex].type === 2 && entities[innerIndex].type === 0)
                    ) {
                        nextEntity.type = entities[innerIndex].type;
                        nextEntity.dx = entities[innerIndex].dx;
                        nextEntity.dy = entities[innerIndex].dy;
                    } else {
                        entities[innerIndex].type = nextEntity.type;
                        entities[innerIndex].dx = nextEntity.dx;
                        entities[innerIndex].dy = nextEntity.dy;
                    }
                }
            }
        }
        updatedEntities.push(nextEntity);
    }
    return updatedEntities;
}

//TODO: I think I can probably simplify this logic and remove this function?
const useAnimationFrame = (callback: (deltaTime: number) => void) => {
    // Use useRef for mutable variables that we want to persist
    // without triggering a re-render on their change
    const requestRef = React.useRef<number>(0);
    const previousTimeRef = React.useRef<number>(0);
    const frameTime = React.useState<number>(performance.now());

    const animate = (time: number) => {
        if (previousTimeRef.current !== undefined) {
            const deltaTime = time - previousTimeRef.current;
            callback(deltaTime);
        }
        previousTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    }

    React.useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, []); // Make sure the effect runs only once

    return frameTime;
}

const RpsEntity: React.FunctionComponent<{data: IRpsEntity}> = (props) => {
    let emoticon: React.JSX.Element = <>{props.data.index}</>;

    if(props.data.type === 0) {
        emoticon = <RockSVG key={`i${props.data.index}`} width={"32px"} height={"32px"} />;
    } else if (props.data.type === 1) {
        emoticon = <PaperSVG key={`i${props.data.index}`} width={"32px"} height={"32px"} />;
    } else if (props.data.type === 2) {
        emoticon = <ScissorsSVG key={`i${props.data.index}`} width={"32px"} height={"32px"} />;
    }

    return <span key={props.data.index} style={{
        position: 'absolute',
        left: `${props.data.x}px`,
        top: `${props.data.y}px`,
        height: '32px',
        width: '32px'
    }}>
        {emoticon}
    </span>
}

export const RpsArena: React.FunctionComponent<IRpsArenaProps> = (props) => {
    const rpsEntities = React.useRef<IRpsEntity[]>([]);
    const gameRunning = React.useRef<boolean>(false);
    const [, setCurrentTime] = React.useState(performance.now());

    function gameLoop(time: number) {
        //Changing a byRef variable doesn't cause the component to update but the variable value will update here.
        //Changing a byState variable does, but the value won't update in here.
        setCurrentTime(time);
        if (gameRunning.current) {
            //Update positions
            let updatedEntities = updateEntityPositions(rpsEntities.current, props.width, props.height);

            //Check collisions
            updatedEntities = checkCollisions(updatedEntities);

            rpsEntities.current = updatedEntities;

            //Check complete
            if(updatedEntities.every(entity => updatedEntities[0].type === entity.type)) {
                gameRunning.current = false;
            }
        }
    }

    //Start loop
    useAnimationFrame(gameLoop);

    return <div style={{flexDirection:"column", display:"flex", alignItems: "center"}}>
        <span>RPS Arena</span>
        <div style={{display:"flex", flexDirection:"row"}}>
            <button onClick={() => {
                if(!gameRunning.current) {
                    rpsEntities.current = generateRpsEntities(props.entityCount, props.width, props.height);
                }
                gameRunning.current = !gameRunning.current;
            }}>{gameRunning.current ? "Stop" : "Start"}</button>
            <button onClick={() => {
                rpsEntities.current = shakeRpsEntities(rpsEntities.current);
            }}>Shake</button>
            <button onClick={() => {
                rpsEntities.current = speedUpEntities(rpsEntities.current);
            }}>Speed Up</button>
        </div>
        <div id="rpsArena" style={{
            width:`${props.width}px`,
            height:`${props.height}px`,
            borderColor: 'black',
            borderWidth: '1px',
            backgroundColor: 'gray',
            display: 'block',
            position: 'relative'
        }}>
            {rpsEntities.current.map(entity => <RpsEntity data={entity} />)}
        </div>
    </div>;
}