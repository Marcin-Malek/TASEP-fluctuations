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
const squaredFluctuations = new Float64Array(maxTime).fill(0);
const jumpOccurencesData = { x: [], y: [], type: "scatter" };
const jumpFluctuationsData = {
  x: [],
  y: [],
  type: "scatter",
  line: {
    stroke: "1px",
    color: "#FF00000A",
  },
};
const jumpOccurencesPlot = [];
const jumpFluctuationsPlot = [];

const MAX_CURRENT_CONDITION = alpha > 0.5 && beta > 0.5;
const LOW_DENSITY_CONDITION = alpha <= 0.5 && beta >= alpha;
const HIGH_DENSITY_CONDITION = alpha > 0.5 && beta < 0.5

const writeLog = (msg) => {
  return new Promise((resolve) => {
    process.stdout.write(msg.toString(), resolve);
  });
};

const init = () => {
  lattice.forEach((_, index) => {
    if (index < Math.floor(size / 2) - 1) {
      lattice[index] = Math.random() < 1 - beta ? 1 : 0;
    } else {
      lattice[index] = Math.random() < alpha ? 1 : 0;
    }
  });
};

const mainLoop = async () => {
  while (time <= maxTime) {
    for (let i = 0; i < size; i++) {
      const cell = Math.floor(Math.random() * (size + 1)) - 1;
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
      // console.clear();
      // await writeLog(lattice);
      // await setTimeout(3); //just to avoid output blinking
    }
    time++;
    let current = 0.25;
    if (LOW_DENSITY_CONDITION) {
      current = alpha * (1 - alpha); 
    } else if (HIGH_DENSITY_CONDITION) {
      current = beta * (1 - beta);
    }
    const fluctuation = Nt - (current * time);
    jumpOccurencesData.x.push(time);
    jumpOccurencesData.y.push(Nt);
    jumpFluctuationsData.x.push(time);
    jumpFluctuationsData.y.push(fluctuation);
    squaredFluctuations[time] += Math.pow(fluctuation, 2);
  }
};

init();
while (runCount < runs) {
  await mainLoop();
  time = 0;
  Nt = 0;
  runCount++;
  jumpOccurencesPlot.push({ ...jumpOccurencesData });
  jumpOccurencesData.x = [];
  jumpOccurencesData.y = [];
  jumpFluctuationsPlot.push({ ...jumpFluctuationsData });
  jumpFluctuationsData.x = [];
  jumpFluctuationsData.y = [];
}
const plotInfoString = `a: ${alpha}, b: ${beta}, ${runs} runs on a ${size} sites lattice`;
const scale = MAX_CURRENT_CONDITION ? 1 / 3 : 1 / 2;
plot(jumpOccurencesPlot, {
  title: {
    text: `Total jumps through central site<br>${plotInfoString}`,
  },
  xaxis: { title: "t" },
  yaxis: { title: "N<sub>t</sub>" },
});
plot(jumpFluctuationsPlot, {
  title: {
    text: `Current fluctuations<br>${plotInfoString}`,
  },
  showlegend: false,
  xaxis: { title: "t" },
  yaxis: { title: "N<sub>t</sub> - &#188; t" },
});
plot(
  jumpFluctuationsPlot.map((runData) => ({
    ...runData,
    y: runData.y.map((value, index) => value / Math.pow(runData.x[index], scale)),
  })),
  {
    title: {
      text: `Current fluctuations scaled with t<sup style="font-size:80% !important">${scale === 1/3 ? "&#8531;" : "&#189;"}</sup><br>${plotInfoString}`,
    },
    showlegend: false,
    xaxis: { title: "t" },
    yaxis: {
      title:
        `(N<sub>t</sub> - &#188; t) / t<sup style="font-size:90% !important">${scale === 1/3 ? "&#8531;" : "&#189;"}</sup>`,
    },
  },
);
// Deviation plot
plot([squaredFluctuations.reduce((acc, curr, index) => ({
		...acc,
		x: [...acc.x, index + 1],
		y: [...acc.y, Math.sqrt(curr / runs) / Math.pow(index + 1, scale)],
	}),{ x: [], y: [], type: "scatter" })], {
		title: { text: `Scaled standard deviation<br>${plotInfoString}` },
		xaxis: { title: "t" },
		yaxis: { title: `&#x3C3; / t<sup style="font-size:90% !important">${scale === 1/3 ? "&#8531;" : "&#189;"}</sup>` }
  }
);

