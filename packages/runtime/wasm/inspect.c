#include "common.h"
#include "manager.h"
#include "micro.h"
#include "symbol.h"

extern int web_symbol_count(void);
static IPtr seen[2048];
static int seen_count, budget;

EM_JS(void, inspect_begin, (char *type, int key, int size, int origin), {
    var value = {type: UTF8ToString(type), key, size, origin, items: []};
    var stack = Module['inspectionStack'];
    if (stack.length) stack[stack.length-1].items.push(value);
    else Module['inspectionValue'] = value;
    stack.push(value);
});
EM_JS(void, inspect_end, (char *label, int truncated), {
    var value = Module['inspectionStack'].pop();
    value.label = UTF8ToString(label).trim().replace(/;$/, '');
    value.truncated = !!truncated;
    if (value.type === 'set' || value.type === 'tuple') {
        var set = value.type === 'set';
        value.label = (!set && value.origin !== 1 ? value.origin + '@' : '') +
            (set ? '{' : '[') + value.items.map(x => x.label).join(', ') +
            (truncated ? (value.items.length ? ', ' : '') + '…' : '') + (set ? '}' : ']');
    }
});
EM_JS(void, inspect_variable, (char *name), {
    Module['inspection'].push({name: UTF8ToString(name), value: Module['inspectionValue']});
});

static void inspect_value(IPtr value, int depth) {
    ENTER;
    Reg(seq);
    Reg(item);
    int key, size = 0, count = 0, collection, truncated = 0;
    char label[257], *type = "value";
    FILE *file;
    for (key = 0; key < seen_count; key++) if (mcEq(value, seen[key])) break;
    if (key == seen_count && seen_count < 2048) seen[seen_count++] = value;
    collection = Kind(value) == Set || Kind(value) == Tuple;
    if (collection) {
        type = Kind(value) == Set ? "set" : "tuple";
        R(seq) = Kind(value) == Set ? Set_Value(value) : Tuple_Value(value);
        size = mcLen(value);
    } else switch (Kind(value)) {
        case Integer: case Bignum: case Rational: case Real: type = "number"; break;
        case String: type = "string"; break;
        case Boolean: type = "boolean"; break;
        case Closure: case Predef: type = "function"; break;
        case File: type = "file"; break;
        case Undefined: type = "undefined"; break;
    }
    inspect_begin(type, key, size, Kind(value) == Tuple ? Tuple_Origin(value) : 1);
    label[0] = 0;
    if (collection) {
        if (depth < 3 && budget > 0) {
            R(seq) = mcStart(R(seq));
            while (count < 80 && budget > 0 && mcNext(&R(item), &R(seq), true)) {
                count++; budget--;
                inspect_value(R(item), depth + 1);
            }
        }
        truncated = count < size;
    } else if (Kind(value) == String) {
        snprintf(label, sizeof(label), "\"%.250s\"", Str_Value(value));
        truncated = strlen(Str_Value(value)) > 250;
    } else if (Kind(value) == Real) snprintf(label, sizeof(label), "%.17g", Real_Value(value));
    else if (Kind(value) == File) strcpy(label, "file");
    else if (Kind(value) == Closure || Kind(value) == Predef) strcpy(label, "function");
    else {
        file = tmpfile();
        if (file) {
            mcPrint(value, file, false); mcFlush(file);
            rewind(file);
            count = fread(label, 1, 256, file); label[count] = 0;
            truncated = count == 256;
            fclose(file);
        } else strcpy(label, "unavailable");
    }
    inspect_end(label, truncated);
    LEAVE;
}

void web_inspect(void) {
    int i, count = 0;
    IPtr value;
    seen_count = 0; budget = 1024;
    for (i = 1; i <= web_symbol_count() && count < 128; i++) {
        value = Var_Value(Get_Assoc(i));
        if (Locked(i) || Kind(value) == Undefined || Kind(value) == Predef) continue;
        inspect_value(value, 0);
        inspect_variable(Id_String(i));
        count++;
    }
}
