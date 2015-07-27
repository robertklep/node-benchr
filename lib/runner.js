var Benchmark = require('benchmark');
var Table     = require('easy-table');
var chalk     = require('chalk');
var path      = require('path');
var format    = require('util').format;

function pad(num, chr) {
  return Array(num + 1).join(chr || ' ');
}

var Runner = module.exports = function Runner(files) {
  if (! (this instanceof Runner)) {
    return new Runner(files);
  }
  this.files = files;
};

Runner.prototype.run = function() {
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
  var idx = 0;
  suite.on('start', function() {
    process.stdout.write(format('%s• Suite `%s` (%s benchmark%s): ',
      pad(2),
      this.name,
      this.length,
      this.length === 1 ? '' : 's'
    ));
  }).on('cycle', function() {
    process.stdout.write('.');
  }).on('error', function(err) {
  }).on('complete', function() {
    var t        = new Table();
    var finished = 0;
    this.forEach(function(bench) {
      if (bench.aborted) {
        t.cell('status', pad(4) + chalk.red('× ABORTED'));
      } else {
        finished++;
        t.cell('status', pad(4) + chalk.green('✔'));
      }
      t.cell('name',   bench.name + ': ');
      if (! bench.aborted) {
        t.cell('hz',     bench.hz.toFixed(2).toString().replace(/\B(?=(\d{3})+\b)/g, ','), function(str, width) {
          return Table.padLeft(str, width);
        });
        t.cell('label',  'ops/sec');
        t.cell('rme',    '±' + bench.stats.rme.toFixed(2) + '%');
        t.cell('runs',   '(' + bench.stats.sample.length + ' runs sampled)');
      }
      t.newRow();
    });
    console.log('\n\n' + t.print());
    if (finished > 1) {
      console.log(pad(4) + chalk.green('➔ Fastest is ' + this.filter('fastest').pluck('name')) + '\n');
    }
  });
};

Runner.prototype.addBenchmark = function(name, fn) {
  var suite = this.suites[this.suites.length - 1];
  if (typeof name === Function) {
    fn   = name;
    name = 'Benchmark#' + (suite.length + 1);
  }
  // async?
  var async = fn.length === 1;
  var bench = new Benchmark({
    maxTime : 2,
    name  : name,
    defer : async,
    fn    : function(deferred) {
      return fn(function(err) {
        if (err) {
          deferred.benchmark._error = err;
          deferred.benchmark.abort();
        }
        deferred && deferred.resolve();
      });
    }
  });
  suite.add(bench);
};
