---
title: "Bringing Java AWT to the Browser"
description: "How I built a clean-room Java AWT runtime using TeaVM."
pubDate: "Aug 28 2026"
# heroImage: "../../assets/blog-placeholder-3.jpg"
draft: true
---

## Background

Java Applets died years ago when modern browsers dropped NPAPI plugin support,
taking decades of desktop software and legacy games with them.

And it was the right call! Java was... Well to put it nicely, insecure. Java
'drive-bys' were rather common, since the applet was running in a standalone
JVM - a totally seperate process from the browser, outside of all standard
browser sandboxing mechanisms. There were attempts to make it more secure (such
as disallowing a number of permissions that an unsigned applet would have, and
eventually blocking unsigned applets by default completely) but the writing was
on the wall. The browser model had won and NPAPI was a liability.

With the death of plugins an incredible amount of early web history and
enterprise software tooling was effectively stranded. But today, the browser
ecosystem looks fundamentally different. Browsers now have many additional
features that function in ways that meet the same needs as many applets did. For
basic rendering primitives there's the
[Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API), for
audio there's
[Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API),
there's even the ability to access external peripherals like
[USB](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API) and
[Serial](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API), and
more devices (provided you're not on
[Firefox](https://mozilla.github.io/standards-positions) which is a bit pickier
on what APIs they implement, for privacy reasons.)

And while those features are neat, they don't really address the _existing_
software that lives on only as applets. If the source is available, in theory
one could do a source port of it to JavaScript and make use of all those fancy
APIs... But that would require significant work, and potentially introduce other
bugs or issues that don't reflect the original applet's intention/design. And
that is only feasible if the source code to the applet is available in the first
place.

What if instead of rewriting line-by-line, you could target the existing JVM
bytecode and compile it to run inside the browser's sandbox itself?

### TeaVM

That is where [TeaVM](https://teavm.org/) enters the picture. TeaVM is an
ahead-of-time compiler that takes Java _bytecode_ (`.class` files) and
transpiles them into a number of different targets (WebAssembly and JavaScript
are the ones we use, but it can also target C.) What really sets it apart is the
fact that you don't need the original source code at all, you can take an
existing java class, feed it into TeaVM, and it will emit functionally
equivilant code. In addition, TeaVM (optionally) performs aggressive
optimizations on the code, such as dead-code removal, devirtualization, and more
to yield remarkably small and fast artifacts.

However TeaVM alone isn't enough to run a GUI application. It knows how to
translate the logic, and even portions of the runtime (thanks to their fantastic
[classlib](https://teavm.org/docs/runtime/java-classes.html) interop layer)
however the ability to run Swing and AWT programs is explicitly not a part of
TeaVM. konsoletyper (the core developer behind TeaVM) has said the following in
an [issue](https://github.com/konsoletyper/teavm/issues/406) requesting for
Swing and AWT support:

> First of all, AWT and Swing port can be made as a separate project. Just
> follow package naming convention and use `T` prefix (see `classlib` module)
> and this should work. Second, personally I'm too busy to maintain such a
> project. Third, I just don't see any purpose on porting Swing. [...] TeaVM is
> not focused on running existing Java, applications, it trades compatibility
> for efficiency.

That's _more_ than fair. Knowing what I know now about how deep the AWT iceberg
actually goes, I completely understand why it was outside the scope of TeaVM
core.

However there were some applets I wanted to run in a modern browser. My primary
focus were some games from my childhood, but I also had a professional reason
too! I've had a long term client who years ago I made some applets for a few
different uses.

One was a ~500 line applet to redact personal information from customer images,
saving them from buying expensive image editing licenses for every machine. But
for the other applets, the original developers were long gone, the source code
was lost, and the binaries were heavily obfuscated. Porting my own code by hand
was plausible... But resurrecting the rest required a runtime solution.

### A Brief Interlude

Before diving into the implementation, it helps to understand why AWT is such a
unique beast compared to modern web UI libraries—or even later Java frameworks
like Swing.

Designed in the mid-90s, AWT relied on a architecture built around **heavyweight
native peers**. When you instantiated a `java.awt.Button` or
`java.awt.TextField`, Java didn't draw pixels onto a surface. Instead, the JVM
invoked native C code via JNI to instantiate a real OS widget—an `HWND` on
Windows, a `Widget` on X11, or an `NSView` on macOS—and handed a native memory
handle back to Java. The `java.awt.Button` object was essentially just a remote
control for a widget owned by the operating system.

Stnadard Desktop AWT Flow:

```
[Java Application] -> [java.awt.Button] -> [Button Peer] -> [JNI] -> [Win32/X11/Cocoa Widget]
```

Later on, Swing introduced 'lightweight' components, which renedered their own
pixels in Java. But even then under the hood Swing relies on AWT, every Swing
window had to ultimiately sit inside of an AWT `Frame` or `Applet` - a root
heavyweight peer.

## Into the Madness
