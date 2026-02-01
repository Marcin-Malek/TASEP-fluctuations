import { useState, useRef, useCallback, useEffect } from 'react';
import { MAX_STEPS_PER_FRAME } from './consts';

export const useSimulation = (config) => {
  const {
    size,
    alpha,
    beta,
    runs,
    maxTime,
    speed = MAX_STEPS_PER_FRAME / 2
  } = config;

  const animate = speed !== MAX_STEPS_PER_FRAME;
  const animationFrameId = useRef(null);

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const [completedRuns, setCompletedRuns] = useState([]);
  const [currentRunData, setCurrentRunData] = useState(null);

  const [phaseStats, setPhaseStats] = useState({ name: '', J: 0.25, exponent: 0.5 });

  const simulationState = useRef({
    lattice: [],
    Nt: 0,
    time: 0,
    runCount: 0,
    history: [{ t: [], Nt: [], fluctuation: [] }],
    squaredFluctuations: new Float64Array(maxTime).fill(0),
  });

  const calculatePhase = (a, b) => {
    if ((a > 0.5 && b > 0.5) || (a === 0.5 && b === 0.5)) {
      return { name: "Maximal Current (MC)", J: 0.25, rho: 0.5, exponent: 1 / 3 };
    }
    else if (a <= 0.5 && a < b) {
      return { name: "Low Density (LD)", J: a * (1 - a), rho: a, exponent: 0.5 };
    }
    else if (b < 0.5 && b < a) {
      return { name: "High Density (HD)", J: b * (1 - b), rho: 1 - b, exponent: 0.5 };
    }
    else if (a === b && a < 0.5) {
      return { name: "Coexistence", J: a * (1 - a), rho: a, exponent: 0.5 };
    }
    return { name: "Unknown", J: 0.25, rho: 0.5, exponent: 0.5 };
  };

  const initSystem = useCallback(() => {
    const params = calculatePhase(alpha, beta);
    setPhaseStats(params);

    const newLattice = new Array(size).fill(0).map((_, index) => index < Math.floor(size / 2) - 1 ? 
      (Math.random() < 1 - beta ? 1 : 0) : 
      (Math.random() < alpha ? 1 : 0)
    );

    simulationState.current = {
      lattice: newLattice,
      Nt: 0,
      time: 0,
      runCount: 0,
      history: [{ t: [], Nt: [], fluctuation: [] }],
      squaredFluctuations: new Float64Array(maxTime).fill(0),
    };

    setCurrentRunData(null);
  }, [size, alpha, beta]);

  const loop = useCallback(() => {
    if (!isRunning) return;

    const state = simulationState.current;
    const params = phaseStats;
    const lattice = state.lattice;

    let stepsInThisFrame = 0;
    const startTime = performance.now();

    while (
      state.time < maxTime &&
      (
        !animate || 
        (performance.now() - startTime < 24 && stepsInThisFrame < speed)
      )
    ) {
      for (let i = 0; i <= size; i++) {
        const cell = Math.floor(Math.random() * (size + 1)) - 1;

        if (cell === -1 && lattice[0] === 0 && Math.random() < alpha) {
          lattice[0] = 1;
        } else if (
          cell === size - 1 &&
          lattice[cell] === 1 &&
          Math.random() < beta
        ) {
          lattice[cell] = 0;
        } else if (lattice[cell] === 1 && lattice[cell + 1] === 0) {
          lattice[cell] = 0;
          lattice[cell + 1] = 1;
          if (cell === Math.floor(size / 2) - 1) {
            state.Nt++;
          }
        }
      }
      
      state.time++;
      stepsInThisFrame++;
      
      const currentFluctuation = state.Nt - (params.J * state.time);
      
      state.history.at(-1).t.push(state.time);
      state.history.at(-1).Nt.push(state.Nt);
      state.history.at(-1).fluctuation.push(currentFluctuation);
      state.squaredFluctuations[state.time - 1] += Math.pow(currentFluctuation, 2);
    }
    const runData = { ...state.history.at(-1) };
    animate && setCurrentRunData(runData);

    if (state.time < maxTime) {
      if (animate) {
        animationFrameId.current = requestAnimationFrame(loop);
      }
    } else {
      setCurrentRunData(null);
      state.runCount++;
      if (state.runCount < runs) {
        state.Nt = 0;
        state.time = 0;
        state.history.push({ t: [], Nt: [], fluctuation: [] });
        animate && setCompletedRuns(prev => [...prev, runData]);
        setProgress((state.runCount / runs) * 100);
        animationFrameId.current = requestAnimationFrame(loop);
      } else {
        setCompletedRuns([...state.history]);
        setProgress(100);
        setIsRunning(false);
      }
    }
  }, [isRunning, maxTime, size, alpha, beta, speed, phaseStats]);

  const start = () => {
    if (simulationState.current.time >= maxTime) {
      initSystem();
    }
    setIsRunning(true);
    animationFrameId.current = requestAnimationFrame(loop);
  };

  const stop = () => {
    cancelAnimationFrame(animationFrameId.current);
    animationFrameId.current = null;
    setIsRunning(false);
  };

  const reset = () => {
    stop();
    setCompletedRuns([]);
    setProgress(0);
    initSystem();
  };

  useEffect(() => {
    loop();
  }, [loop]);

  useEffect(() => {
    reset();
  }, [size, alpha, beta, maxTime]);

  return {
    currentRunData,
    completedRuns,
    squaredFluctuations: simulationState.current.squaredFluctuations,
    phaseStats,
    progress,
    isRunning,
    start,
    stop,
    reset
  };
};