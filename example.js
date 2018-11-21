function sync(a, b) {
  doStuff(a, b);
  return result;
}

function cb(c, d) {
}

function async(a, b, cb) {
  cb(a, b);
}

function prom(a, b) {
  return new Promise();
}


test(1, 2);

sync.before(function (a, b, cb) {
  cb(a + 1, b + 1);
});

sync.after(function (result, cb) {
  cb(result + 1);
});

async.before(function (a, b, cb) {
  cb(a + 1, b + 1);
})

sync.after(function (c, d, cb) {
  cb(c + 1, d + 1);
})

prom.before(function (a, b, cb) {
  cb(a, b);
});

prom.after(function (p, cb) {
  cb(p.then(result => {

  }))
});

function trap(a, b, c) {
  let r;
  let cb = c.pop();
  before1.apply(b, [
    before2.bind(b,
      before3.bind(b,
        function partial() {
          a.apply(b,
            Array.prototype.slice.call(arguments).concat(
              after1.bind(b,
                after2.bind(b,
                  after3.bind(b,
                    cb
                  )
                )
              )
            )
          )
        }
      )
    )
  ].concat(c));
  return r;
}
