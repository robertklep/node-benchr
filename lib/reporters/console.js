const { format } = require('util');
const Table      = require('easy-table');
const chalk      = require('chalk');

module.exports = runner => {
  runner.on('run.start', file => {
  }).on('run.complete', file => {
  }).on('file.start', file => {
    console.log('• %s:\n', file);
  }).on('file.complete', file => {
  }).on('suite.start', suite => {
    process.stdout.write(format('%s• %s', pad(2), suite.name));
  }).on('suite.cycle', suite => {
    process.stdout.write('.');
  }).on('error', err => {
    console.error(err);
  }).on('suite.complete', suite => {
    let fastest    = suite.filter('fastest');
    let successful = suite.filter('successful');
    let table      = new Table();

    suite.forEach(function(bench) {
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
          let diff = chalk.green(italicize('fastest'));
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
}

function italicize(s) {
  return '\x1b[3m' + s + '\x1b[23m';
}

function pad(num, chr) {
  return Array(num + 1).join(chr || ' ');
}
