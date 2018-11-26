
// before 1
function next(b, a, t, h, g) {
  "use strict";
  var r;
  b[0].fn.apply(
    h,
    [
      function extract() {
        r = t.apply(h, arguments);
      }
    ].concat(g)
  );
  return r;
}

//before 3
function next(b, a, t, h, g) {
  "use strict";
  var r;
  b[0].fn.apply(
    h,
    [
      b[1].fn.bind(
        h,
        b[2].fn.bind(h, function extract() {
          r = t.apply(h, arguments);
        })
      )
    ].concat(g)
  );
  return r;
}

// after 1
function next(b, a, t, h, g) {
  "use strict";
  var r;
  r = t.apply(h, g);
  a[0].fn.apply(h, [
    function extract(s) {
      r = s;
    },
    r
  ]);
  return r;
}

// after 3
function next(b, a, t, h, g) {
  "use strict";
  var r;
  r = t.apply(h, g);
  a[0].fn.apply(h, [
    a[1].fn.bind(
      h,
      a[2].fn.bind(h, function extract(s) {
        r = s;
      })
    ),
    r
  ]);
  return r;
}

// before 3, after 3
function next(b, a, t, h, g) {
  "use strict";
  var r;
  b[0].fn.apply(
    h,
    [
      b[1].fn.bind(
        h,
        b[2].fn.bind(h, function extract() {
          r = t.apply(h, arguments);
        })
      )
    ].concat(g)
  );
  a[0].fn.apply(h, [
    a[1].fn.bind(
      h,
      a[2].fn.bind(h, function extract(s) {
        r = s;
      })
    ),
    r
  ]);
  return r;
}
// before 1
function next(b, a, t, h, g) {
  "use strict";
  var z;
  typeof g[g.length - 1] == "function" && (z = g.pop());
  b[0].fn.apply(
    h,
    [
      function partial() {
        t.apply(b, Array.prototype.slice.call(arguments).concat(z || []));
      }
    ].concat(g)
  );
}


//before 3
function next(b, a, t, h, g) {
  "use strict";
  var z;
  typeof g[g.length - 1] == "function" && (z = g.pop());
  b[0].fn.apply(
    h,
    [
      b[1].fn.bind(
        h,
        b[2].fn.bind(h, function partial() {
          t.apply(b, Array.prototype.slice.call(arguments).concat(z || []));
        })
      )
    ].concat(g)
  );
}

// after 1
function next(b, a, t, h, g) {
  "use strict";
  var z;
  typeof g[g.length - 1] == "function" && (z = g.pop());
  t.apply(b, g.concat(a[0].fn.bind(h, z || [])));
}







// after 3
function next(b, a, t, h, g) {
  "use strict";
  var z;
  typeof g[g.length - 1] == "function" && (z = g.pop());
  t.apply(
    b,
    g.concat(a[0].fn.bind(h, a[1].fn.bind(h, a[2].fn.bind(h, z || []))))
  );
}







//before 3, after 3
function next(b, a, t, h, g) {
  "use strict";
  var z;
  typeof g[g.length - 1] == "function" && (z = g.pop());
  b[0].fn.apply(
    h,
    [
      b[1].fn.bind(
        h,
        b[2].fn.bind(h, function partial() {
          t.apply(
            b,
            Array.prototype.slice
              .call(arguments)
              .concat(
                a[0].fn.bind(h, a[1].fn.bind(h, a[2].fn.bind(h, z || [])))
              )
          );
        })
      )
    ].concat(g)
  );
}
