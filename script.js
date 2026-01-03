import { setTimeout } from "timers/promises";
import { plot } from "nodeplotlib";

let Nt = 0;
let time = 0;
let runCount = 0;
let isRunning = true;
const size = Number(process.argv[2]);
const alpha = Number(process.argv[3]);
const beta = Number(process.argv[4]);
const maxTime = Number(process.argv[5]);
const runs = Number(process.argv[6]);
const lattice = new Array(size).fill(0);
const jumpOccurencesData = { x: [], y: [], type: "scatter" };
const jumpFluctuationsData = { 
	x: [], 
	y: [], 
	type: "scatter", 
	line: { 
		stroke: "1px", 
		color: "#FF00000A"
	}
};
const jumpOccurencesPlot = [];
const jumpFluctuationsPlot = [];

const MAX_CURRENT_CONDITION = alpha > 0.5 && beta > 0.5;

const writeLog = (msg) => {
	return new Promise((resolve) => {
		process.stdout.write(msg.toString(), resolve);
	});
};

const init = () => {
	lattice.forEach((_, index) => { 
		lattice[index] = Math.random() > 0.5 ? 1 : 0; // u_1/2 or u_p-,p+ ?
	});
}

const mainLoop = async () => {
	while (time <= maxTime) {
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
		jumpOccurencesData.x.push(time);
		jumpOccurencesData.y.push(Nt);
		if (MAX_CURRENT_CONDITION) {
			jumpFluctuationsData.x.push(time);
			jumpFluctuationsData.y.push(Nt - 0.25 * time);
		}
	}
}

init();
while (runCount <= runs) {
	await mainLoop();
	time = 0;
	Nt = 0;
	runCount++;
	//isRunning = false;
	jumpOccurencesPlot.push({...jumpOccurencesData});
	jumpOccurencesData.x = [];
	jumpOccurencesData.y = [];
	jumpFluctuationsPlot.push({...jumpFluctuationsData});
	jumpFluctuationsData.x = [];
	jumpFluctuationsData.y = [];
}

plot(jumpOccurencesPlot);
if (MAX_CURRENT_CONDITION) {
	plot(jumpFluctuationsPlot);
	plot(jumpFluctuationsPlot.map(runData => ({
		...runData, 
		y: runData.y.map((value, index) => (value / Math.pow(index, 1/3)))
	}))); 
}
