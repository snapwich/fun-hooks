function sync(a, b) {
	doStuff(a, b)
	return result;
}

function cb(c , d) {}

function async(a, b, cb) {
	cb(a, b);
}

function prom(a, b) {
	return new Promise();
}



test(1, 2)

sync.before(function(a, b, cb) {
	cb(a + 1, b + 1);
});

sync.after(function(result, cb) {
	cb(result + 1);
});

async.before(function(a, b, cb) {
	cb(a + 1, b + 1);
})

sync.after(function(c, d, cb) {
	cb(c + 1, d + 1);
})

prom.before(function(a, b, cb) {
	cb(a, b);
});

prom.after(function(p, cb) {
	cb(p.then(result => {
	
	}))
});
