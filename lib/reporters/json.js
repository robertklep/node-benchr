module.exports = runner => {
  // Handle output options.
  const prettyPrint = runner.options.prettyPrint;
  const progress    = runner.options.progress;
  const verbose     = runner.options.verbose;

  // Handle runner events.
  let currentFile, currentSuite, stats = [];
  runner.on('run.start', file => {
    progress && process.stderr.write('R');
  }).on('file.start', file => {
    progress && process.stderr.write('F');
    currentFile = {
      name   : file,
      suites : [],
    };
    stats.push(currentFile);
  }).on('file.complete', file => {
    progress && process.stderr.write('f');
  }).on('suite.start', suite => {
    progress && process.stderr.write('S');
    currentSuite = {
      name       : suite.name,
      benchmarks : [],
    };
    currentFile.suites.push(currentSuite);
  }).on('suite.complete', suite => {
    progress && process.stderr.write('s');

    // Add the name(s) of the fastest benchmark(s).
    currentSuite.fastest = suite.filter('fastest').map('name'); 

    // Handle benchmark statistics.
    currentSuite.benchmarks = suite.map(bench => {
      if (verbose) return bench;
      delete bench.stats.sample;
      return {
        name    : bench.name,
        hz      : bench.hz,
        aborted : bench.aborted,
        stats   : bench.stats,
      };
    });
  }).on('benchmark.start', () => {
    progress && process.stderr.write('B');
  }).on('benchmark.complete', () => {
    progress && process.stderr.write('b');
  }).on('run.complete', () => {
    progress && process.stderr.write('r\n');
    if (prettyPrint) {
      console.log(JSON.stringify(stats, null, 2));
    } else {
      console.log('%j', stats);
    }
  })
};
