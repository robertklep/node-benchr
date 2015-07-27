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

// A contrived async example.
suite('Finding a substring, async style', function() {

  benchmark('RegExp#test', function(done) {
    /o/.test('Hello World!');
    done();
  });

  benchmark('String#indexOf', function(done) {
    'Hello World!'.indexOf('o') > -1;
    done();
  });

  benchmark('String#match', function(done) {
    !!'Hello World!'.match(/o/);
    done();
  });

});
