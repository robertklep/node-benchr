var Benchmark = require('benchmark');
var Table     = require('easy-table');
var chalk     = require('chalk');
var path      = require('path');
var format    = require('util').format;

function italicize(s) {
  return '\x1b[3m' + s + '\x1b[23m';
}

function pad(num, chr) {
  return Array(num + 1).join(chr || ' ');
}

var Runner = module.exports = function Runner(options, files) {
  if (! (this instanceof Runner)) {
    return new Runner(options, files);
  }
  this.options = options;
  this.files   = files;
};

Runner.prototype.run = function(options) {
  this._run(this.files.shift());
};

Runner.prototype._run = function(file) {
  // No more files to run?
  if (file === undefined) {
    return;
  }

  var runner      = this;
  this.suites     = [];

  // 😱
  global.suite     = this.addSuite.bind(this);
  global.benchmark = this.addBenchmark.bind(this);

  // Import test file.
  var testFn = require(path.resolve(process.cwd(), file));

  // If the test file exports a factory function, call it to pass the `suite`
  // and `benchmark` functions.
  if (typeof testFn === 'function' && testFn.length === 2) {
    testFn(global.suite, global.benchmark);
  }

  function runSuite(suite) {
    // No more suites to run?
    if (suite === undefined) {
      return runner._run(runner.files.shift());
    }
    if (runner.options['--grep']) {
      var re = new RegExp(runner.options['--grep'], 'i')
      if (!re.test(suite.name)) {
        return runSuite(runner.suites.shift());
      }
    }
    suite.run({ async : true }).on('complete', function() {
      return runSuite(runner.suites.shift());
    });
  }
  if (! this.suites.length) {
    return this._run(this.files.shift());
  }
  console.log('• %s:\n', file);
  return runSuite(this.suites.shift());
};

Runner.prototype.addSuite = function(name, opts, fn) {
  if (typeof name === 'function') {
    fn   = name;
    name = 'Suite#' + (this.suites.length + 1);
    opts = {};
  } else if (typeof opts === 'function') {
    fn   = opts;
    opts = {};
  }

  // Create a new suite
  var suite  = this.suites[this.suites.length] = new Benchmark.Suite(name);
  suite.opts = opts;

  // Register benchmarks and hooks.
  fn();

  // Set up event handlers and start the suite.
  suite.on('start', function() {
    process.stdout.write(format('%s• %s', pad(2), this.name));
  }).on('cycle', function() {
    process.stdout.write('.');
  }).on('error', function(err) {
    console.error(err);
  }).on('complete', function() {
    var fastest    = this.filter('fastest');
    var successful = this.filter('successful');
    var table      = new Table();
    this.forEach(function(bench) {
      if (bench.aborted) {
        table.cell('status', pad(4) + chalk.red('×'));
      } else {
        table.cell('status', pad(4) + chalk.green('✔'));
      }
      table.cell('name', italicize(chalk[ bench.aborted ? 'red' : 'green' ](bench.name)));
      if (bench.aborted) {
        table.cell('hz', chalk.red('ABORTED'));
      } else {
        table.cell('hz',    bench.hz.toFixed(2).toString().replace(/\B(?=(\d{3})+\b)/g, ','), Table.padLeft);
        table.cell('label', 'ops/sec');
        table.cell('rme',   '±' + bench.stats.rme.toFixed(2) + '%');
        table.cell('runs',  '(' + bench.stats.sample.length + ' runs)');

        // Show percentual difference between this benchmark and the fastest.
        if (fastest.length !== successful.length) {
          var diff = chalk.green(italicize('fastest'));
          if (bench !== fastest[0]) {
            diff = chalk.red('-' + ((1.0 - bench.hz / fastest[0].hz) * 100).toFixed(2) + '%');
          }
          table.cell('diff', diff, Table.padLeft);
        }
      }
      table.newRow();
    });
    console.log('\n\n' + table.print());
    if (successful.length > 1) {
      process.stdout.write(pad(4) + '➔ ');
      if (fastest.length === successful.length) {
        console.log('No discernible winner\n');
      } else {
        console.log('Fastest is ' + chalk.green(italicize(fastest.map('name'))) + '\n');
      }
    }
  });
};

Runner.prototype.addBenchmark = function(name, opts, fn) {
  // Implicitly add a suite when there aren't any yet while defining this benchmark.
  if (this.suites.length === 0) {
    this.addSuite(() => {});
  }
  var suite = this.suites[this.suites.length - 1];

  // Check arguments.
  if (typeof name === 'function') {
    fn   = name;
    name = 'Benchmark#' + (suite.length + 1);
    opts = {};
  } else if (typeof opts === 'function') {
    fn   = opts;
    opts = {};
  }

  // Nothing to do...?
  if (typeof fn !== 'function') return;

  // If fn accepts at least one argument, we'll assume that it takes
  // a callback, making the test asynchronous.
  var isDeferred   = fn.length > 0 || opts.promises === true || suite.opts.promises === true;
  var usesPromises = opts.promises === true || suite.opts.promises === true;

  // Check to see if it returns something that looks like a promise,
  // also making it asynchronous.
  if (! isDeferred) {
    var ret      = fn();
    isDeferred   = usesPromises = ret && ret.then;
    usesPromises = isDeferred;
  }

  // Wrap async tests.
  var func = isDeferred ? function(deferred) {
    if (usesPromises) {
      fn().then(function() {
        deferred.resolve();
      }).catch(function(e) {
        deferred.benchmark.abort();
      });
    } else {
      fn(function(err) {
        if (err) return deferred.benchmark.abort();
        deferred.resolve();
      });
    }
  } : fn;

  // Add the benchmark function to the suite.
  suite.add({
    name    : name,
    defer   : isDeferred,
    fn      : func,
    delay   : Number(this.options['--delay']),
    minTime : Number(this.options['--min-time']),
    maxTime : Number(this.options['--max-time']),
  });
};
