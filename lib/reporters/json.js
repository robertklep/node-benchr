module.exports = runner => {
  let verbose = runner.verbose;
  let stats   = [];
  let currentFile, currentSuite;
  runner.on('run.start', file => {
    verbose && process.stderr.write('R');
  }).on('file.start', file => {
    verbose && process.stderr.write('F');
    currentFile = {
      name   : file,
      suites : [],
    };
    stats.push(currentFile);
  }).on('file.complete', file => {
    verbose && process.stderr.write('f');
  }).on('suite.start', suite => {
    verbose && process.stderr.write('S');
    currentSuite = {
      name       : suite.name,
      benchmarks : [],
    };
    currentFile.suites.push(currentSuite);
  }).on('suite.complete', suite => {
    verbose && process.stderr.write('s');
    currentSuite.benchmarks = suite.map(b => b);
  }).on('benchmark.start', () => {
    verbose && process.stderr.write('B');
  }).on('benchmark.complete', () => {
    verbose && process.stderr.write('b');
  }).on('run.complete', () => {
    verbose && process.stderr.write('r\n');
    console.log('%j', stats);
  })
};
