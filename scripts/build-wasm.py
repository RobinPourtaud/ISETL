#!/usr/bin/env python3
"""Build the archived interpreter without changing the historical sources."""
import os
from pathlib import Path
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / '.build' / 'isetl'
BUILD.mkdir(parents=True, exist_ok=True)
for source in (ROOT / 'ISETLSRC').iterdir():
    if source.suffix.upper() not in ('.C', '.H'):
        continue
    text = source.read_text(encoding='latin1')
    text = text.replace('extern double atof(STR);', '').replace('extern double atof();', '')
    # Old compilers accepted conflicting internal/external function declarations.
    text = re.sub(r'\bstatic\s+(?=(?:void|int|char\s*\*|Bool|C_Real|AST_Ptr|IPtr|FILE\s*\*)\s*\w+\s*\()', '', text)
    if source.name == 'SYMBOL.C':
        text += '\nint web_symbol_count(void) { return known; }\n'
    if source.name == 'MANAGER.C':
        text = text.replace('#include \"common.h\"', '#include \"common.h\"\nextern void Mark_Globals(void);')
    if source.name == 'COMMON.H':
        text = text.replace('extern char *malloc(INT);', '#include <stdlib.h>')
        text = text.replace('extern void free(STR);', '')
        text = text.replace('char * index(STR X CHAR);', '')
    if source.name == 'EDIT.C':
        text = text.replace('c = getc(yyin);', 'c = yyin == stdin ? web_getchar(reading, inside) : getc(yyin);')
    if source.name == 'DEBUG.H':
        text = text.replace('MSG("Syntax", x);', 'web_error(); MSG("Syntax", x);')
    if source.name == 'PARSER.C':
        text = text.replace('void yyerror(i) char *i; {', 'void yyerror(i) char *i; { web_error();')
    if source.name == 'INTERP.C':
        text = text.replace('if (setjmp(err_ret)) {', 'if (setjmp(err_ret)) { web_error();')
        text = text.replace('reading = true;\n    ReadExecute', 'reading = true;\n    if (f == FNULL && yyin != stdin) { f = stdin; last = 0; }\n    ReadExecute')
        text = text.replace('reading = true;\n    if (f != FNULL)', 'reading = true;\n    if (f == FNULL && yyin != stdin) { f = stdin; last = 0; }\n    if (f != FNULL)')
    if source.name == 'GRAPH.C':
        text = text.replace('void SOUTTEXT(char* text) {', 'void SOUTTEXT(char* text) {\n    web_text(text);\n    CPx += strlen(text) * 8 * char_mult;')
        text = text.replace('FORCE_GRAPH;\n#ifdef TURBOC\n    PlotX', 'FORCE_GRAPH;\n    web_title(Str_Value(x));\n#ifdef TURBOC\n    PlotX')
        text = text.replace('stop = clock() + t*CLK_TCK;', 'emscripten_sleep((unsigned int)(max(0,t)*1000));\n    return NonPrint;\n    stop = clock() + t*CLK_TCK;')
        text = text.replace('FILE * F;', 'FILE * F = NULL;')
        text = text.replace('QLink active = Erase_Mode ? Erasable : Current;', 'QLink active;\n    if (!Current) START_GRAPH();\n    if (!Graphics) OPEN_GRAPH();\n    active = Erase_Mode ? Erasable : Current;')
        text = text.replace('++obj_count;', 'if (!Current) START_GRAPH();\n    ++obj_count;')
        text = text.replace('for( p=Image; NEXT(p)!=NULL;', 'if (!Image) START_GRAPH();\n    for( p=Image; NEXT(p)!=NULL;')
        text = text.replace('%[^`]', '%199[^`]')
    if source.name == 'SCANNER.C':
        text = text.replace('system(arg);', 'RT_ERROR("Host shell commands are unavailable in the browser");')
    if source.name == 'PREDEF.C':
        text = text.replace('system(cmd);', 'RT_ERROR("Host shell commands are unavailable in the browser");')
    (BUILD / source.name.lower()).write_text(text)

sources = '''ast debug edit emitter globals graph init_ops interp keywords manager
mc_aux mc_data mc_htree mc_io mc_set mc_stack mc_tree mc_tuple mp
op_arith op_aux op_ctrl op_data op_io op_logic parser predef rev_info scanner sort symbol'''.split()
emcc = os.environ.get('EMCC') or shutil.which('emcc') or str(ROOT / '.tools/emsdk/upstream/emscripten/emcc')
flags = ['-std=gnu89', '-O2', '-w', '-Wno-error=implicit-function-declaration', '-Wno-error=int-conversion',
         '-Wno-error=incompatible-pointer-types', '-Wno-error=implicit-int', '-Wno-error=return-type',
         '-DPrototype', '-DDouble', '-DInitCast', '-DStringH', '-DIndex', '-DBigRand', '-DGRAPHICS',
         '-DVolatile', '-DCLK_TCK=CLOCKS_PER_SEC', '-fno-common', '-I' + str(BUILD),
         '-include', str(ROOT / 'packages/runtime/wasm/platform.h')]
output = ROOT / 'packages/runtime/generated'
output.mkdir(exist_ok=True)
command = [emcc, *flags, *(str(BUILD / (s + '.c')) for s in sources),
           str(ROOT / 'packages/runtime/wasm/platform.c'), str(ROOT / 'packages/runtime/wasm/inspect.c'), '-lm', '-sASYNCIFY',
           '-sALLOW_MEMORY_GROWTH', '-sSTACK_SIZE=1048576', '-sINITIAL_MEMORY=33554432',
           '-sMAXIMUM_MEMORY=268435456', '-sMODULARIZE', '-sEXPORT_ES6',
           '-sENVIRONMENT=web,worker,node', '-sINVOKE_RUN=0', '-sEXIT_RUNTIME=1',
           '-sEXPORTED_RUNTIME_METHODS=FS,callMain', '-sEXPORTED_FUNCTIONS=_main,_web_inspect',
           '-sASYNCIFY_STACK_SIZE=131072', '-sASSERTIONS=1',
           '-sALLOW_TABLE_GROWTH', '-sEMULATE_FUNCTION_POINTER_CASTS',
           '-o', str(output / 'isetl.js')]
subprocess.run(command, check=True)
