#include "common.h"
#include "manager.h"
#include "micro.h"
#include "predef.h"
#include "graph.h"
#include "scanner.h"

EM_JS(void, web_error, (), { Module['markError'](); });

EM_ASYNC_JS(int, web_getchar, (int is_reading, int is_inside), {
    return await Module['readCharacter'](is_reading, is_inside);
});
EM_JS(void, web_draw, (int op, double a, double b, double c, double d), {
    Module['draw']({op, a, b, c, d});
});
EM_JS(void, web_text, (char *text), {
    Module['draw']({op: 7, text: UTF8ToString(text)});
});
EM_JS(void, web_title, (char *text), {
    Module['draw']({op: 8, text: UTF8ToString(text)});
});
EM_ASYNC_JS(void, web_coordinate, (), {
    Module['coordinate'] = await Module['readCoordinate']();
});
EM_JS(double, web_coordinate_part, (int part), { return Module['coordinate'][part]; });

void initialize(char **argv) {}
void ile(void) {}
int ile_getc(void) { return web_getchar(reading, inside); }
void Init_Signals(void) {}
void Hold_Signals(void) {}
void on_int(int value) { RT_ERROR("Interrupted"); }
void do_exit(int value) { exit(value); }

int main(void) {
    char *args[] = {"isetl", "-d", "-s", NULL};
    setvbuf(stdout, NULL, _IONBF, 0);
    setvbuf(stderr, NULL, _IONBF, 0);
    max_mem = 64000000L;
    _main(3, args);
    return 0;
}

void moveto(int x, int y) { web_draw(1, x, y, 0, 0); }
void lineto(int x, int y) { web_draw(2, x, y, 0, 0); }
void rectangle(int l, int t, int r, int b) { web_draw(3, l, t, r, b); }
void bar3d(int l, int t, int r, int b, int depth, int topoff) { web_draw(4, l, t, r, b); }
void setwritemode(int mode) { web_draw(5, mode, 0, 0, 0); }
int getmaxx(void) { return 959; }
int getmaxy(void) { return 639; }
void PREPARE(void) {}
void PENSIZE(short width) { linewidth = width; web_draw(6, width, 0, 0, 0); }
void SETCHARSIZE(double size) { web_draw(9, size, 0, 0, 0); }
void CLEAR_GRAPH(void) { web_draw(0, 0, 0, 0, 0); }
void CLOSE_GRAPH(void) { Graphics = false; }
void OPEN_GRAPH(void) {
    Graphics = true;
    XtoYaspect = 1;
    MAXX = getmaxx(); MAXY = getmaxy();
    if (Val_Min_X == Val_Max_X) {
        Val_Min_X = Val_Min_Y = -1;
        Val_Max_X = Val_Max_Y = 1;
        set_scale();
    }
    CLEAR_GRAPH();
}
void pdXGraphics(int value) { if (value) OPEN_GRAPH(); else CLOSE_GRAPH(); }
void flip_mode(void) { pdXGraphics(!Graphics); }
Pd0(pdXtoYratio) { return New_Real(XtoYaspect); }
Pd0(pdRes) {
    ENTER;
    Reg(ans);
    R(ans) = mcCons(New_Real((Val_Max_Y-Val_Min_Y)/MAXY), Nil);
    R(ans) = mcCons(New_Real((Val_Max_X-Val_Min_X)/MAXX), R(ans));
    R(ans) = New_Tuple(R(ans), 1);
    LEAVE R(ans);
}
Pd0(pdGetCoord) {
    ENTER;
    Reg(ans);
    Reg(value);
    char key[2];
    FORCE_GRAPH;
    web_coordinate();
    key[0] = (char)web_coordinate_part(2); key[1] = 0;
    R(value) = New_String(key);
    R(ans) = mcCons(R(value), Nil);
    R(value) = New_Real(descaleY(web_coordinate_part(1)));
    R(ans) = mcCons(R(value), R(ans));
    R(value) = New_Real(descaleX(web_coordinate_part(0)));
    R(ans) = mcCons(R(value), R(ans));
    R(ans) = New_Tuple(R(ans), def_orig);
    LEAVE R(ans);
}
