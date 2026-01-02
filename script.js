import { setTimeout } from "timers/promises";
import { plot } from "nodeplotlib";

let Nt = 0;
let time = 0;
let isRunning = true;
const size = Number(process.argv[2]);
const alpha = Number(process.argv[3]);
const beta = Number(process.argv[4]);
const lattice = new Array(size).fill(0);
const jumpOccurencesPlot = { x: [], y: [], type: "scatter" };
const jumpFluctuationsPlot = { x: [], y: [], type: "scatter", line: { color: "red" }};

const writeLog = (msg) => {
	return new Promise((resolve) => {
		process.stdout.write(msg.toString(), resolve);
	});
};

const mainLoop = async () => {
	for (let i=0; i<size; i++) {
		const cell = Math.floor(Math.random() * (size+1)) - 1;
		if (cell === -1 && lattice[0] === 0 && Math.random() < alpha) { 
			// enter
			lattice[0] = 1;
		} else if (
			cell === size - 1 && 
			lattice[cell] === 1 && 
			Math.random() < beta
		) { 
			// exit
			lattice[cell] = 0;			
		} else if (lattice[cell] === 1 && lattice[cell + 1] === 0) { 
			//jump
			lattice[cell] = 0;
			lattice[cell + 1] = 1;
			
			if (cell === Math.floor(size / 2) - 1) {
				Nt++;	
			}
		}	
		
		//console.clear();
		//await writeLog(lattice);
		//await setTimeout(3); //just to avoid output blinking
	}
	time++;
	jumpOccurencesPlot.x.push(time);
	jumpOccurencesPlot.y.push(Nt);
	jumpFluctuationsPlot.x.push(time);
	jumpFluctuationsPlot.y.push(Nt - 0.25 * time)
}

while (isRunning) {
	await mainLoop();
	if (time > 10000) {
		plot([jumpOccurencesPlot]);
		plot([jumpFluctuationsPlot]);
		break;
	}
}
