suite('Finding a substring', function() {

  benchmark('RegExp#test', function() {
    /o/.test('Hello World!');
  });

  benchmark('String#indexOf', function() {
    'Hello World!'.indexOf('o') > -1;
  });

  benchmark('String#match', function() {
    !!'Hello World!'.match(/o/);
  });

});

// Using promises
suite('Async timeout testing using promises', () => {

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

suite('Async timeout testing using callbacks', () => {

  benchmark('100ms', (done) => {
    setTimeout(done, 100);
  });

  benchmark('200ms', (done) => {
    setTimeout(done, 200);
  });

});
