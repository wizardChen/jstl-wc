var jstlWc = typeof(exports) == 'undefined' ? {} : exports;
;(function(exports){

	var settings = {
		cL	: '<wc:ft',
		cR	: '</wc:ft>',
		sT	: '#{',
		sL	: '{',
		sR	: '}',
		re	: {
			$code	: /<wc:ft(.+?)>([\s\S]+?)<\/wc:ft>$/i,
			$id		: /id\s*=\s*"(.+?)"/i,
			$if		: /if\s*=\s*"\#\{(.+?)\}"/i,
			$for	: /for\s*=\s*"\#\{(.+?)\}"/i,
			$else	: /else\s*=\s*"#(.+?)"/i
		}
	};
	/**
	 * 获取成对出现的符号中间的内容
	 * exp：
	 *	getPairs('(i+(i++))', '(',')') == i+(i++)
	 */
	var getPairs = function(str, l, r) {
		var str = str || '';
		var l = l == undefined ? settings.cL : l;
		var r = r == undefined ? settings.cR : r;
		var iL = str.indexOf(l);
		var iR = str.indexOf(r);
		var iN = str.indexOf(l, iL + l.length);
		var ret = {
			index	: -1,
			length	: 0,
			string	: ''
		};
		while(iN > 0 && iN < iR) {
			iR = str.indexOf(r, iR + r.length);
			iN = str.indexOf(l, iN + l.length);
		}
		if( iL == -1 ) {
			return ret;
		}
		else if( iR == -1 ) {
			throw('nested error[index:' + iL + ',line:' + str.substring(0,iL).split('\n').length + ']');
		}
		else {
			ret.index = iL;
			ret.length = iR - iL + r.length;
			ret.string = str.substring(iL, iR + r.length)
		}
		return ret;
	}
	/**
	 * 未完成...
	 */
	var extend = function() {
		var args = arguments;
		var isDeep = false;
		var target = args[0];
		if( typeof(args[0]) == 'boolean' ) {
			isDeep = args[0];
			target = args[1];
		}
		for(var i=(target === args[0] ? 1 : 2); i<args.length; i++) {
			var src = args[i];
			for(var attr in args[i]) {
				target[attr] = src[attr];
			}
		}
		return target;
	}

	var render = function(code, options) {
		return compile(code, options).call();
	}
	var compile = function(code, options) {
		var oc = [];
		var ctx = extend(true, {}, options, {
			 $pageContext	: {}
			,$condition		: {}
			,$out			: {
				 print	: function(str) {oc.push(str);}
				,clear	: function() {var ret = oc;oc = [];return ret;}
			}
		});
		var opts = extend(true, {}, settings, options);
		return function(){
			return parse.call(ctx, opts, code);
		};
	}
	var parse = function(opts, code) {
		var oc = '';
		var ctx = this;
		while(true) {
			var ic = code.indexOf(opts.cL);
			var is = code.indexOf(opts.sT);
			if( ic != -1 && (is == -1 || ic < is) ) {
				var pair = parseCode.call(ctx, opts, code.substr(ic));
				oc += code.substring(0, ic) + pair.value;
				code = code.substring(ic + pair.length);
			}
			if( is != -1 && (ic == -1 || is < ic) ) {
				var pair = parseScript.call(ctx, opts, code.substr(is));
				oc += code.substring(0, is) + pair.value;
				code = code.substring(is + pair.length + opts.sT.length - opts.sL.length);
			}
			if( !code.length || (ic == -1 && is == -1) ) {
				oc += code;
				break;
			}
		}
		return oc;
	}
	var parseCode = function(opts, code) {
		var oc = '';
		var ctx = this;
		var pair = getPairs(code, opts.cL, opts.cR);
		if( pair.length ) {
			var $code = (pair.string.match(opts.re.$code) || [])[2];
			var $expr = (pair.string.match(opts.re.$code) || [])[1];
			if( $expr && $code ) {
				var $id = ($expr.match(opts.re.$id) || [])[1] || ('#'+(new Date().getTime() + parseInt(Math.random()*100)));
				var $if = ($expr.match(opts.re.$if) || [])[1];
				var $for = ($expr.match(opts.re.$for) || [])[1];
				var $else = ($expr.match(opts.re.$else) || [])[1];

				if( $if ) {
					$if = ctx.$condition[$id] = _eval('return (!!' + $if + ')', ctx);
				}
				if( $else ) {
					$else = !ctx.$condition[$else];
				}
				var judge = $if !== undefined ? $if : ($else !== undefined ? $else : true);
				if( judge ) {
					if( $for ) {
						$for = _eval('return (' + $for + ')', ctx);
						ctx = extend(false, {}, ctx, {'$item' : null, '$i' : null});
						if( typeof($for) == 'number' ) {
							for(var i=0; i<$for; i++) {
								ctx['$i'] = i;
								ctx['$item'] = i;
								oc += parse.call(ctx, opts, $code);
							}
						}
						else if( typeof($for) == 'object' ) {
							for(var i in $for) {
								ctx['$i'] = i;
								ctx['$item'] = $for[i];
								oc += parse.call(ctx, opts, $code);
							}
						}
						else if( undefined != $for /*typeof($for) == 'array'*/ ) {
							for(var i=0; i<$for.length; i++) {
								ctx['$i'] = i;
								ctx['$item'] = $for[i];
								oc += parse.call(ctx, opts, $code);
							}
						}
					}
					else {
						oc += parse.call(ctx, opts, $code);
					}
				}
			}
		}
		return extend(pair, {value:oc});
	}
	var parseScript = function(opts, code) {
		var oc = '';
		var ctx = this;
		var pair = {length:0};
		var idx = code.indexOf(opts.sT);
		if( idx != -1 ) {
			code = code.substring(idx);
			pair = getPairs(code, opts.sL, opts.sR);
		}
		if( pair.length ) {
			var $code = pair.string;
				$code = $code.substring(opts.sL.length, $code.length - opts.sR.length);
			if( $code.charAt(0) == '=' ) {
				$code = 'return (' + $code.substr(1) + ')';
			}
			var ret = _eval($code, ctx);
			oc += ctx.$out.clear().join('') + (ret !== undefined ? ret : '');
		}
		return extend(pair, {value:oc});
	};
	var _eval = function(code, ctx) {
		return new Function('ctx', 'with(ctx){' + code + '}').call(code, ctx);
	}

	exports.render = render;
	exports.compile = compile;
})(jstlWc);