## benchr

Node.js benchmark runner, modelled after [`Mocha`](http://mochajs.org/) and [`bencha`](https://www.npmjs.com/package/bencha), based on [Benchmark.js](http://benchmarkjs.com/).

### Installation

```
$ npm i benchr [-g]
```

### Usage

Run the `benchr` script and provide it with files containing benchmarks:

```
$ benchr benchmarks/**/*.js
$ benchr benchmarks/suite1.js benchmarks/suite2.js benchmarks/suite3.js
```

### Options

```
$ benchr -h
benchr – benchmark runner

Usage:
  benchr [options] <file>...

Options:
  -h --help                  Show this screen
  -V --version               Show version
  -d --delay=<s>             Delay between test cycles, in seconds       [default: 0]
  -M --min-time=<s>          Minimum run time per test cycle, in seconds [default: 0]
  -m --max-time=<s>          Maximum run time per test cycle, in seconds [default: 5]
  -g --grep=<s>              Only run suites matching pattern
  -R --reporter=<name/file>  Reporter to use, either a file path or built-in (`console` or `json`) [default: console]
  -r --require=<module>      `require()` a module before starting (for instance, `babel-register`)
  -p --progress              Show progress       (depending on reporter)
  -P --pretty-print          Pretty-print output (depending on reporter)
  -v --verbose               More verbose output (depending on reporter)
```

### Suites + benchmarks

A benchmark file declares one or more suites, each with one or more benchmarks to run.

#### Syntax

```javascript
suite(NAME[, OPTIONS], FN);
benchmark(NAME[, OPTIONS], FN);
```

Calling `suite()` is optional.

#### Synchronous benchmarks

```javascript
suite('Finding a substring', () => {

  benchmark('RegExp#test', () => {
    /o/.test('Hello World!');
  });

  benchmark('String#indexOf', () => {
    'Hello World!'.indexOf('o') > -1;
  });

  benchmark('String#match', () => {
    !!'Hello World!'.match(/o/);
  });

});
```

(taken from the example on the [Benchmark.js](http://benchmarkjs.com/) website)

#### Asynchronous benchmarks

##### Using promises

Return a promise from a benchmark function and it will be tested asynchronously:

```javascript
suite('Timeouts', () => {

  benchmark('100ms', () => {
    return new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  });

  benchmark('200ms', () => {
    return new Promise((resolve) => {
      setTimeout(resolve, 200);
    });
  });

});
```

**NOTE**: to determine if a function under test returns a promise, it is called once before the tests start. If this is undesirable, for instance due to side-effects, set the `promises` option for the benchmark or the entire suite:

```javascript
suite('Timeouts',  { promises : true }, () => { ... });
benchmark('100ms', { promises : true }, () => { ... });
```

##### Using callbacks

If a benchmark takes an argument, it is assumed to be a continuation callback (pass any errors as first argument to abort the test):

```javascript
suite('Timeouts', () => {

  benchmark('100ms', (done) => {
    setTimeout(done, 100);
  });

  benchmark('200ms', (done) => {
    setTimeout(done, 200);
  });

});
```

#### Playing nice with linters

To work around linter errors regarding `suite` and `benchmark` being undefined, your test files can export a function that would take `suite` and `benchmark` as its arguments, thereby making the linter happy:

```javascript
module.exports = (suite, benchmark) => {
  suite('My test suite', () => {
    benchmark('Bench 1', ...);
    benchmark('Bench 2', ...);
    ...
  })
}
```

### Using the Runner programmatically

```
const Runner = require('benchr');
const runner = new Runner({
    reporter    : Function,
    grep        : String,
    delay       : Number,
    minTime     : Number,
    maxTime     : Number,
    progress    : Boolean,
    prettyPrint : Boolean,
    verbose     : Boolean,
}, [ "file1.js", "file2.js", ... ]);
```

All options map to the similarly-named command line options.

### Implementing a reporter

A reporter is a CommonJS module that should export a function that gets passed a benchmark runner instance as argument.

This runner instance implements the `EventEmitter` interface, and will emit the following events:

* `run.start` / `run.complete`
* `file.start` / `file.complete`
* `suite.start` / `suite.complete`
* `benchmark.start` / `benchmark.complete`

The different parts are explained as follows:
* a _"run"_ consists of one or more files containing benchmarks
* a _"file"_ is a file that exports or contains one or more suites
* a _"suite"_ is a structure that consists of one or more benchmarks (where each benchmark is used in a comparison between the other benchmarks in the same suite)
* a _"benchmark"_ is a single test

### TODO

- [x] Option to pass custom reported module
- [x] Before/after hooks
- [x] Benchmark/suite options (minTime, maxTime, ...)
- [x] Separate reporters (very hardcoded now)
- [x] Handle multiple "fastest" benchmarks better
- [x] Promises support (just like Mocha)
