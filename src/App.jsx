import { useEffect, useMemo, useState } from 'react';
import './App.css';
import Plot from 'react-plotly.js';
import { useSimulation } from './useSimulation';
import { MAX_STEPS_PER_FRAME } from './consts';

const TasepSimulator = () => {
  const [params, setParams] = useState({ alpha: 0.5, beta: 0.5, size: 512, runs: 500, maxTime: 5000, speed: MAX_STEPS_PER_FRAME / 2 });
  const [standardDeviationPlotData, setStandardDeviationPlotData] = useState([]);
  const sim = useSimulation(params);
  const plotInfoString = `a: ${params.alpha}, b: ${params.beta}, ${params.runs} runs on a ${params.size} sites lattice`;

  const plotData = [
    ...sim.completedRuns.map((run, i) => ({
      x: run.t,
      y: run.Nt,
      type: 'scatter',
      mode: 'lines',
      name: `Run ${i + 1}`,
    })),
    ...(sim.currentRunData ? [{
      x: sim.currentRunData.t,
      y: sim.currentRunData.Nt,
      type: 'scatter',
      mode: 'lines',
      line: { color: 'red', width: 2 },
      name: 'Current'
    }] : [])
  ];

  const fluctuationPlotData = [
    ...sim.completedRuns.map((run, i) => ({
      x: run.t,
      y: run.fluctuation,
      type: 'scatter',
      mode: 'lines',
      line: {
        stroke: "1px",
        color: "#FF00000A",
      },
      hovertemplate:
        `<span style="color: black"><b>Run ${i + 1}</b></span><br>` +
        `<span style="color: black">t: %{x}</span><br>` +
        `<span style="color: black">y: %{y:.3f}</span>` +
        '<extra></extra>',
    })),
    ...(sim.currentRunData ? [{
      x: sim.currentRunData.t,
      y: sim.currentRunData.fluctuation,
      type: 'scatter',
      mode: 'lines',
      line: { color: 'red', width: 2 },
      name: 'Current'
    }] : [])
  ];

  useEffect(() => {
    setStandardDeviationPlotData([sim.squaredFluctuations.reduce((acc, curr, index) => ({
      ...acc,
      x: [...acc.x, index],
      y: [...acc.y, Math.sqrt(curr / sim.completedRuns.length) / Math.pow(index, sim.phaseStats.exponent)],
    }), { x: [], y: [], type: "scatter", mode: "lines" })]);
  }, [sim.completedRuns.length]);

  const ntPlot = useMemo(() => (
    <Plot
          data={plotData.map((runData) => ({
            ...runData,
            y: runData.y.map((value) => value),
          }))}
          layout={{
            title: {
              text: `Total jumps through central site<br>${plotInfoString}`,
            },
            showlegend: false,
            xaxis: { title: { text: "t" }, range: [0, params.maxTime] },
            yaxis: {
              title: {
                text: "N<sub>t</sub>",
              }
            }
          }}
          config={{
            responsive: true,
          }}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
        />
  ), [plotData?.at(-1)?.x.length, sim.isRunning]);

  const fluctuationPlot = useMemo(() => (
    <Plot
          data={fluctuationPlotData.map((runData) => ({
            ...runData,
            y: runData.y.map((value) => value),
          }))}
          layout={{
            title: {
              text: `Current fluctuations<br>${plotInfoString}`,
            },
            showlegend: false,
            xaxis: { title: { text: "t" }, range: [0, params.maxTime] },
            yaxis: {
              title: {
                text: "N<sub>t</sub> - &#188; t",
              }
            }
          }}
          config={{
            responsive: true,
          }}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
        />
  ), [fluctuationPlotData?.at(-1)?.y.length, sim.isRunning]);

  const scaledFluctuationPlot = useMemo(() => (
    <Plot
          data={fluctuationPlotData.map((runData) => ({
            ...runData,
            y: runData.y.map((value, index) => value / Math.pow(runData.x[index], sim.phaseStats.exponent)),
          }))}
          layout={{
            title: {
              text: `Current fluctuations scaled with t<sup style="font-size:80% !important">${sim.phaseStats.exponent === 1 / 3 ? "&#8531;" : "&#189;"}</sup><br>${plotInfoString}`,
            },
            showlegend: false,
            xaxis: { title: { text: "t" }, range: [0, params.maxTime] },
            yaxis: {
              title: {
                text: `(N<sub>t</sub> - &#188; t) / t<sup style="font-size:90% !important">${sim.phaseStats.exponent === 1 / 3 ? "&#8531;" : "&#189;"}</sup>`,
              }
            }
          }}
          config={{
            responsive: true,
          }}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
        />
  ), [fluctuationPlotData?.at(-1)?.y.length, sim.isRunning]);

  const deviationPlot = useMemo(() => (
    <Plot
          data={standardDeviationPlotData}
          layout={{
            title: {
              text: `Scaled standard deviation<br>${plotInfoString}`
            },
            showlegend: false,
            xaxis: { title: { text: "t" }, range: [0, params.maxTime] },
            yaxis: {
              title: {
                text: `&#x3C3; / t<sup style="font-size:90% !important">${sim.phaseStats.exponent === 1 / 3 ? "&#8531;" : "&#189;"}</sup>`,
              }
            }
          }}
          config={{
            responsive: true,
          }}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
        />
  ), [standardDeviationPlotData, sim.isRunning]);

  return (
    <>
      <form className="top-bar">

        <div className='app-name'>
          TASEP
        </div>

        <div className='vertical-group'>
          <div className="slider-row">
            <label title="Enter probability (left boundary)">
              &alpha;:
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={params.alpha}
              disabled={sim.isRunning}
              onChange={(e) => setParams({ ...params, alpha: e.target.value ? parseFloat(e.target.value) : 0 })}
              style={{ cursor: sim.isRunning ? 'not-allowed' : 'pointer' }}
            />
            <span className="value-display">{params.alpha.toFixed(2)}</span>
          </div>

          <div className="slider-row">
            <label title="Exit probability (right boundary)">
              &beta;:
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={params.beta}
              disabled={sim.isRunning}
              onChange={(e) => setParams({ ...params, beta: e.target.value ? parseFloat(e.target.value) : 0 })}
              style={{ cursor: sim.isRunning ? 'not-allowed' : 'pointer' }}
            />
            <span className="value-display">{params.beta.toFixed(2)}</span>
          </div>
        </div>

        <label className="input-group" title="Lattice size (L)">Size:
          <input
            type="number"
            name='size'
            step="1"
            min="0"
            value={params.size || ""}
            disabled={sim.isRunning}
            onChange={(e) => setParams({ ...params, size: e.target.value ? parseInt(e.target.value) : 0 })}
            className="input"
          />
        </label>
        <label className="input-group" title="Max time (t)">Time:
          <input
            type="number"
            name='time'
            step="100"
            min="0"
            value={params.maxTime || ""}
            disabled={sim.isRunning}
            onChange={(e) => setParams({ ...params, maxTime: e.target.value ? parseInt(e.target.value) : 0 })}
            className="input"
          />
        </label>
        <label className="input-group" title="Runs">Runs:
          <input
            type="number"
            name="runs"
            step="1"
            min="0"
            value={params.runs || ""}
            disabled={sim.isRunning}
            onChange={(e) => setParams({ ...params, runs: e.target.value ? parseInt(e.target.value) : 0 })}
            className="input"
          />
        </label>

        <div className="slider-row">
          <label title="Prędkość symulacji">
            Speed:
          </label>
          <input
            type="range"
            name="speed"
            min="0"
            max={MAX_STEPS_PER_FRAME}
            step="50"
            value={params.speed}
            disabled={sim.isRunning}
            onChange={(e) => setParams({ ...params, speed: e.target.value ? parseInt(e.target.value) : 0 })}
            style={{ cursor: sim.isRunning ? 'not-allowed' : 'pointer' }}
          />
          <span className="value-display">{params.speed === MAX_STEPS_PER_FRAME ? "No animation" : params.speed}</span>
        </div>

        <div className='button-group'>
          {!sim.isRunning ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                sim.start();
              }}
              style={{ backgroundColor: '#28a745' }}
              className="button"
            >
              START
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                sim.stop();
              }}
              style={{ backgroundColor: '#dc3545' }}
              className="button"
            >
              STOP
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              sim.reset();
            }}
            className="button"
          >
            RESET
          </button>
        </div>
      </form>
      <progress value={sim.progress} max="100" className="progress-bar"/>

      <div className="main-wrapper">
        {ntPlot}
        {fluctuationPlot}
        {scaledFluctuationPlot}
        {deviationPlot}
      </div>
      <p style={{ fontSize: '0.9em', color: '#777' }}>
        TASEP Simulation. Developed by Marcin Małek.
      </p>
      </>
  );
};

export default TasepSimulator;
