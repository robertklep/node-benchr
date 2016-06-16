## benchr

Node.js benchmark runner, modelled after [`Mocha`](http://mochajs.org/) and [`bencha`](https://www.npmjs.com/package/bencha), based on [Benchmark.js](http://benchmarkjs.com/).

Work in progress!

### Installation

```
$ npm i benchr [-g]
```

### Usage

Run the `benchr` script and provide it with files containing benchmarks:

```
$ benchr benchmarks/**/*.js
```

### Options

```
$ benchr -r
benchr – benchmark runner

Usage:
  benchr [options] <file>...

Options:
  -h --help           Show this screen
  -v --version        Show version
  -d --delay=<s>      Delay between test cycles, in seconds       [default: 0]
  -M --min-time=<s>   Minimum run time per test cycle, in seconds [default: 0]
  -m --max-time=<s>   Maximum run time per test cycle, in seconds [default: 5]
```

### Suites + benchmarks

A benchmark file declares one or more suites, each with one or more benchmarks to run.

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

##### Using callbacks

If a benchmark takes an argument, it is assumed to be a callback function:

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

### TODO

- [ ] Before/after hooks
- [x] Benchmark/suite options (minTime, maxTime, ...)
- [ ] Separate reporters (very hardcoded now)
- [x] Handle multiple "fastest" benchmarks better
- [x] Promises support (just like Mocha)
