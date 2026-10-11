#include <emscripten.h>
void web_error(void);
int web_getchar(int reading, int inside);
void web_text(char *text);
void web_title(char *text);
void moveto(int x, int y);
void lineto(int x, int y);
void rectangle(int left, int top, int right, int bottom);
void bar3d(int left, int top, int right, int bottom, int depth, int topoff);
void setwritemode(int mode);
int getmaxx(void);
int getmaxy(void);
#define NORM_WIDTH 1
#define THICK_WIDTH 3
#define COPY_PUT 0
#define XOR_PUT 1
#define SUPPRESS if (!Graphics) return
#define FORCE_GRAPH if (!Graphics) OPEN_GRAPH()
