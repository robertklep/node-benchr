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

  var runner       = this;
  this.suites      = [];
  global.suite     = this.addSuite.bind(this);
  global.benchmark = this.addBenchmark.bind(this);

  require(path.resolve(process.cwd(), file));

  function runSuite(suite) {
    // No more suites to run?
    if (suite === undefined) {
      return runner._run(runner.files.shift());
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

Runner.prototype.addSuite = function(name, fn) {
  if (typeof name === Function) {
    fn   = name;
    name = 'Suite#' + (this.suites.length + 1);
  }

  // Create a new suite
  var suite = this.suites[this.suites.length] = new Benchmark.Suite(name);

  // Register benchmarks and hooks.
  fn();

  // Set up event handlers and start the suite.
  suite.on('start', function() {
    process.stdout.write(format('%s• %s', pad(2), this.name));
  }).on('cycle', function() {
    process.stdout.write('.');
  }).on('error', function(err) {
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

Runner.prototype.addBenchmark = function(name, fn) {
  var suite = this.suites[this.suites.length - 1];
  if (typeof name === Function) {
    fn   = name;
    name = 'Benchmark#' + (suite.length + 1);
  }

  // Check if this should be a deferred test, by assuming that an
  // argument on the benchmark function is a callback function.
  var deferred = false;
  var func     = fn;
  if (fn.length > 0) {
    deferred = true;
    func     = function(deferred) {
      return fn(function(err) {
        if (err) deferred.benchmark.abort();
        deferred.resolve();
      });
    }
  }

  // Add the benchmark function to the suite.
  suite.add({
    name    : name,
    defer   : deferred,
    fn      : func,
    delay   : Number(this.options['--delay']),
    minTime : Number(this.options['--min-time']),
    maxTime : Number(this.options['--max-time']),
  });
};
