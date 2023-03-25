// Migration of Raphaël's getSubpath() to TypeScript
// Raphaël
//   URL: https://github.com/DmitryBaranovskiy/raphael
//   Copyright © 2008-2013 Dmitry Baranovskiy (http://dmitrybaranovskiy.github.io/raphael/)
//   Copyright © 2008-2013 Sencha Labs (http://sencha.com)
//   Licensed under the MIT (http://dmitrybaranovskiy.github.io/raphael/license.html) license.

import { cloneDeep } from "lodash-es"

interface SubPaths {
  start: string
  end: string
}

interface Point {
  x: number
  y: number
  alpha: number
}

type Segment = [string, ...number[]]

type PathSegments = Segment[]

interface PathCurve {
  d: string
  segments: PathSegments
}

interface Attrs {
  x: number
  y: number
  bx: number
  by: number
  X: number
  Y: number
  qx: null | number
  qy: null | number
}

interface Dots {
  x: number
  y: number
  m: {
    x: number
    y: number
  }
  n: {
    x: number
    y: number
  }
  start: {
    x: number
    y: number
  }
  end: {
    x: number
    y: number
  }
  alpha: number
}

const pathCommand =
  /([achlmrqstvz])[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029,]*((-?\d*\.?\d*(?:e[\-+]?\d+)?[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*,?[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*)+)/gi
const pathValues =
  /(-?\d*\.?\d*(?:e[\-+]?\d+)?)[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*,?[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*/gi

function rotate(x: number, y: number, rad: number) {
  const X = x * Math.cos(rad) - y * Math.sin(rad)
  const Y = x * Math.sin(rad) + y * Math.cos(rad)
  return { x: X, y: Y }
}

function l2c(x1: number, y1: number, x2: number, y2: number): number[] {
  return [x1, y1, x2, y2, x2, y2]
}

function q2c(x1: number, y1: number, ax: number, ay: number, x2: number, y2: number): number[] {
  const _13 = 1 / 3,
    _23 = 2 / 3
  return [
    _13 * x1 + _23 * ax,
    _13 * y1 + _23 * ay,
    _13 * x2 + _23 * ax,
    _13 * y2 + _23 * ay,
    x2,
    y2,
  ]
}

function a2c(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  angle: number,
  large_arc_flag: number,
  sweep_flag: number,
  x2: number,
  y2: number,
  recursive: number[]
): any[] {
  // for more information of where this math came from visit:
  // http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
  const _120 = (Math.PI * 120) / 180
  const rad = (Math.PI / 180) * (+angle || 0)
  let res: any[] = []
  let xy: { x: number; y: number }
  let f1: number, f2: number, cx: number, cy: number

  if (!recursive) {
    xy = rotate(x1, y1, -rad)
    x1 = xy.x
    y1 = xy.y
    xy = rotate(x2, y2, -rad)
    x2 = xy.x
    y2 = xy.y
    // var cos = Math.cos((Math.PI / 180) * angle),
    //   sin = Math.sin((Math.PI / 180) * angle),
    const x = (x1 - x2) / 2
    const y = (y1 - y2) / 2
    let h = (x * x) / (rx * rx) + (y * y) / (ry * ry)
    if (h > 1) {
      h = Math.sqrt(h)
      rx = h * rx
      ry = h * ry
    }
    const rx2 = rx * rx
    const ry2 = ry * ry
    const k =
      (large_arc_flag == sweep_flag ? -1 : 1) *
      Math.sqrt(Math.abs((rx2 * ry2 - rx2 * y * y - ry2 * x * x) / (rx2 * y * y + ry2 * x * x)))

    cx = (k * rx * y) / ry + (x1 + x2) / 2
    cy = (k * -ry * x) / rx + (y1 + y2) / 2
    f1 = Math.asin(parseFloat(((y1 - cy) / ry).toFixed(9)))
    f2 = Math.asin(parseFloat(((y2 - cy) / ry).toFixed(9)))

    f1 = x1 < cx ? Math.PI - f1 : f1
    f2 = x2 < cx ? Math.PI - f2 : f2
    f1 < 0 && (f1 = Math.PI * 2 + f1)
    f2 < 0 && (f2 = Math.PI * 2 + f2)

    if (sweep_flag && f1 > f2) {
      f1 = f1 - Math.PI * 2
    }
    if (!sweep_flag && f2 > f1) {
      f2 = f2 - Math.PI * 2
    }
  } else {
    f1 = recursive[0]
    f2 = recursive[1]
    cx = recursive[2]
    cy = recursive[3]
  }
  let df = f2 - f1
  if (Math.abs(df) > _120) {
    const f2old = f2
    const x2old = x2
    const y2old = y2
    f2 = f1 + _120 * (sweep_flag && f2 > f1 ? 1 : -1)
    x2 = cx + rx * Math.cos(f2)
    y2 = cy + ry * Math.sin(f2)
    res = a2c(x2, y2, rx, ry, angle, 0, sweep_flag, x2old, y2old, [f2, f2old, cx, cy])
  }
  df = f2 - f1
  const c1 = Math.cos(f1),
    s1 = Math.sin(f1),
    c2 = Math.cos(f2),
    s2 = Math.sin(f2),
    t = Math.tan(df / 4),
    hx = (4 / 3) * rx * t,
    hy = (4 / 3) * ry * t,
    m1 = [x1, y1],
    m2 = [x1 + hx * s1, y1 - hy * c1],
    m3 = [x2 + hx * s2, y2 - hy * c2],
    m4 = [x2, y2]
  m2[0] = 2 * m1[0] - m2[0]
  m2[1] = 2 * m1[1] - m2[1]
  if (recursive) {
    return [m2, m3, m4, ...res]
  } else {
    res = [m2, m3, m4, ...res].join().split(",")
    const newres: any[] = []
    for (let i = 0, ii = res.length; i < ii; i++) {
      newres[i] = i % 2 ? rotate(res[i - 1], res[i], rad).y : rotate(res[i], res[i + 1], rad).x
    }
    return newres
  }
}

function parsePathString(pathString: string) {
  if (!pathString) {
    return null
  }

  const paramCounts: Record<string, number> = {
    a: 7,
    c: 6,
    h: 1,
    l: 2,
    m: 2,
    r: 4,
    q: 4,
    s: 4,
    t: 2,
    v: 1,
    z: 0,
  }
  const data: PathSegments = []
  if (!data.length) {
    pathString.replace(pathCommand, (a: string, b: string, c: string) => {
      const params: number[] = []
      let name = b.toLowerCase()
      c.replace(pathValues, (a: string, b: string) => {
        b && params.push(+b)
        return ""
      })
      if (name == "m" && params.length > 2) {
        data.push([b, ...params.splice(0, 2)])
        name = "l"
        b = b == "m" ? "l" : "L"
      }
      if (name == "r") {
        data.push([b, ...params])
      } else
        while (params.length >= paramCounts[name]) {
          data.push([b, ...params.splice(0, paramCounts[name])])
          if (!paramCounts[name]) {
            break
          }
        }
      return ""
    })
  }
  return data
}

// http://schepers.cc/getting-to-the-point
function catmullRom2bezier(crp: number[], z: boolean): PathSegments {
  const d: PathSegments = []
  for (let i = 0, iLen = crp.length; iLen - 2 * (z ? 0 : 1) > i; i += 2) {
    const p = [
      { x: +crp[i - 2], y: +crp[i - 1] },
      { x: +crp[i], y: +crp[i + 1] },
      { x: +crp[i + 2], y: +crp[i + 3] },
      { x: +crp[i + 4], y: +crp[i + 5] },
    ]
    if (z) {
      if (!i) {
        p[0] = { x: +crp[iLen - 2], y: +crp[iLen - 1] }
      } else if (iLen - 4 == i) {
        p[3] = { x: +crp[0], y: +crp[1] }
      } else if (iLen - 2 == i) {
        p[2] = { x: +crp[0], y: +crp[1] }
        p[3] = { x: +crp[2], y: +crp[3] }
      }
    } else {
      if (iLen - 4 == i) {
        p[3] = p[2]
      } else if (!i) {
        p[0] = { x: +crp[i], y: +crp[i + 1] }
      }
    }
    d.push([
      "C",
      (-p[0].x + 6 * p[1].x + p[2].x) / 6,
      (-p[0].y + 6 * p[1].y + p[2].y) / 6,
      (p[1].x + 6 * p[2].x - p[3].x) / 6,
      (p[1].y + 6 * p[2].y - p[3].y) / 6,
      p[2].x,
      p[2].y,
    ])
  }

  return d
}

function pathToAbsolute(path: string): PathSegments {
  const pathArray = parsePathString(path)
  if (!pathArray || !pathArray.length) {
    return [["M", 0, 0]]
  }

  let res: PathSegments = [],
    x = 0,
    y = 0,
    mx = 0,
    my = 0,
    start = 0
  if (pathArray[0][0] == "M") {
    x = +pathArray[0][1]
    y = +pathArray[0][2]
    mx = x
    my = y
    start++
    res[0] = ["M", x, y]
  }
  const crz =
    pathArray.length == 3 &&
    pathArray[0][0] == "M" &&
    pathArray[1][0].toUpperCase() == "R" &&
    pathArray[2][0].toUpperCase() == "Z"
  for (let r: Segment, pa, i = start, ii = pathArray.length; i < ii; i++) {
    res.push(r = [] as unknown as Segment)
    pa = pathArray[i]
    if (pa[0] != pa[0].toUpperCase()) {
      r[0] = pa[0].toUpperCase()
      switch (r[0]) {
        case "A":
          r[1] = pa[1]
          r[2] = pa[2]
          r[3] = pa[3]
          r[4] = pa[4]
          r[5] = pa[5]
          r[6] = +(pa[6] + x)
          r[7] = +(pa[7] + y)
          break
        case "V":
          r[1] = +pa[1] + y
          break
        case "H":
          r[1] = +pa[1] + x
          break
        case "R":
          const dots: number[] = [x, y, ...(pa.slice(1) as number[])]
          for (let j = 2, jj = dots.length; j < jj; j++) {
            dots[j] = +dots[j] + x
            dots[++j] = +dots[j] + y
          }
          res.pop()
          res = res.concat(catmullRom2bezier(dots, crz))
          break
        case "M":
          mx = +pa[1] + x
          my = +pa[2] + y
        default:
          for (let j = 1, jj = pa.length; j < jj; j++) {
            r[j] = +pa[j] + (j % 2 ? x : y)
          }
      }
    } else if (pa[0] == "R") {
      const dots: number[] = [x, y, ...(pa.slice(1) as number[])]
      res.pop()
      res = res.concat(catmullRom2bezier(dots, crz))
      r = ["R", ...(pa.slice(-2) as number[])]
    } else {
      for (let k = 0, kk = pa.length; k < kk; k++) {
        r[k] = pa[k]
      }
    }
    switch (r[0]) {
      case "Z":
        x = mx
        y = my
        break
      case "H":
        x = r[1]
        break
      case "V":
        y = r[1]
        break
      case "M":
        mx = r[r.length - 2] as number
        my = r[r.length - 1] as number
      default:
        x = r[r.length - 2] as number
        y = r[r.length - 1] as number
    }
  }
  return res
}

function processPath(path: Segment, d: Attrs, pcom: string): Segment {
  let nx, ny
  const tq = { T: 1, Q: 1 }
  if (!path) {
    return ["C", d.x, d.y, d.x, d.y, d.x, d.y]
  }
  !(path[0] in tq) && (d.qx = d.qy = null)

  switch (path[0]) {
    case "M":
      d.X = path[1]
      d.Y = path[2]
      break
    case "A":
      // @ts-ignore
      path = ["C", ...a2c.apply(0, [d.x, d.y, ...(path.slice(1) as number[])])]
      break
    case "S":
      if (pcom == "C" || pcom == "S") {
        // In "S" case we have to take into account, if the previous command is C/S.
        nx = d.x * 2 - d.bx // And reflect the previous
        ny = d.y * 2 - d.by // command's control point relative to the current point.
      } else {
        // or some else or nothing
        nx = d.x
        ny = d.y
      }
      path = ["C", nx, ny, ...(path.slice(1) as number[])]
      break
    case "T":
      if (pcom == "Q" || pcom == "T") {
        // In "T" case we have to take into account, if the previous command is Q/T.
        d.qx = d.x * 2 - d.qx! // And make a reflection similar
        d.qy = d.y * 2 - d.qy! // to case "S".
      } else {
        // or something else or nothing
        d.qx = d.x
        d.qy = d.y
      }
      path = ["C", ...q2c(d.x, d.y, d.qx, d.qy, path[1], path[2])]
      break
    case "Q":
      d.qx = path[1]
      d.qy = path[2]
      path = ["C", ...q2c(d.x, d.y, path[1], path[2], path[3], path[4])]
      break
    case "L":
      path = ["C", ...l2c(d.x, d.y, path[1], path[2])]
      break
    case "H":
      path = ["C", ...l2c(d.x, d.y, path[1], d.y)]
      break
    case "V":
      path = ["C", ...l2c(d.x, d.y, d.x, path[1])]
      break
    case "Z":
      path = ["C", ...l2c(d.x, d.y, d.X, d.Y)]
      break
  }
  return path
}

function fixArc(pp: PathSegments, i: number, pcoms1: string[]) {
  if (pp[i].length > 7) {
    pp[i].shift()
    const pi = pp[i]
    while (pi.length) {
      pcoms1[i] = "A" // if created multiple C:s, their original seg is saved
      pp.splice(i++, 0, ["C", ...pi.splice(0, 6)] as Segment)
    }
    pp.splice(i, 1)
  }
}

function path2curve(path: string): PathSegments {
  const p = pathToAbsolute(path)
  const attrs = { x: 0, y: 0, bx: 0, by: 0, X: 0, Y: 0, qx: null, qy: null }

  const pcoms1 = [] // path commands of original path p
  let pfirst: string = "" // temporary holder for original path command
  let pcom: string = "" // holder for previous path command of original path

  for (let i = 0, ii = Math.max(p.length, 0); i < ii; i++) {
    p[i] && (pfirst = p[i][0] as string) // save current path command

    if (pfirst != "C") {
      // C is not saved yet, because it may be result of conversion
      pcoms1[i] = pfirst // Save current path command
      i && (pcom = pcoms1[i - 1]) // Get previous path command pcom
    }
    p[i] = processPath(p[i], attrs, pcom) // Previous path command is inputted to processPath

    if (pcoms1[i] != "A" && pfirst == "C") pcoms1[i] = "C" // A is the only command
    // which may produce multiple C:s
    // so we have to make sure that C is also C in original path

    fixArc(p, i, pcoms1) // fixArc adds also the right amount of A:s to pcoms1

    const seg = p[i] as (number | string)[]
    const seglen = seg.length

    attrs.x = seg[seglen - 2] as number
    attrs.y = seg[seglen - 1] as number
    attrs.bx = parseFloat(seg[seglen - 4] as string) || attrs.x
    attrs.by = parseFloat(seg[seglen - 3] as string) || attrs.y
  }
  return p
}

function base3(t: number, p1: number, p2: number, p3: number, p4: number) {
  const t1 = -3 * p1 + 9 * p2 - 9 * p3 + 3 * p4,
    t2 = t * t1 + 6 * p1 - 12 * p2 + 6 * p3
  return t * t2 - 3 * p1 + 3 * p2
}

function bezlen(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
  z: number | null = null
): number {
  if (z == null) {
    z = 1
  }
  z = z > 1 ? 1 : z < 0 ? 0 : z
  const z2 = z / 2,
    n = 12,
    Tvalues = [
      -0.1252, 0.1252, -0.3678, 0.3678, -0.5873, 0.5873, -0.7699, 0.7699, -0.9041, 0.9041, -0.9816,
      0.9816,
    ],
    Cvalues = [
      0.2491, 0.2491, 0.2335, 0.2335, 0.2032, 0.2032, 0.1601, 0.1601, 0.1069, 0.1069, 0.0472,
      0.0472,
    ]
  let sum = 0
  for (let i = 0; i < n; i++) {
    const ct = z2 * Tvalues[i] + z2,
      xbase = base3(ct, x1, x2, x3, x4),
      ybase = base3(ct, y1, y2, y3, y4),
      comb = xbase * xbase + ybase * ybase
    sum += Cvalues[i] * Math.sqrt(comb)
  }
  return z2 * sum
}

function getTatLen(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
  ll: number
) {
  if (ll < 0 || bezlen(x1, y1, x2, y2, x3, y3, x4, y4) < ll) {
    return 0
  }
  const t = 1
  const e = 0.01
  let step = t / 2
  let t2 = t - step
  let l = bezlen(x1, y1, x2, y2, x3, y3, x4, y4, t2)
  while (Math.abs(l - ll) > e) {
    step /= 2
    t2 += (l < ll ? 1 : -1) * step
    l = bezlen(x1, y1, x2, y2, x3, y3, x4, y4, t2)
  }
  return t2
}

function findDotsAtSegment(
  p1x: number,
  p1y: number,
  c1x: number,
  c1y: number,
  c2x: number,
  c2y: number,
  p2x: number,
  p2y: number,
  t: number
): Dots {
  const t1 = 1 - t,
    t13 = Math.pow(t1, 3),
    t12 = Math.pow(t1, 2),
    t2 = t * t,
    t3 = t2 * t,
    x = t13 * p1x + t12 * 3 * t * c1x + t1 * 3 * t * t * c2x + t3 * p2x,
    y = t13 * p1y + t12 * 3 * t * c1y + t1 * 3 * t * t * c2y + t3 * p2y,
    mx = p1x + 2 * t * (c1x - p1x) + t2 * (c2x - 2 * c1x + p1x),
    my = p1y + 2 * t * (c1y - p1y) + t2 * (c2y - 2 * c1y + p1y),
    nx = c1x + 2 * t * (c2x - c1x) + t2 * (p2x - 2 * c2x + c1x),
    ny = c1y + 2 * t * (c2y - c1y) + t2 * (p2y - 2 * c2y + c1y),
    ax = t1 * p1x + t * c1x,
    ay = t1 * p1y + t * c1y,
    cx = t1 * c2x + t * p2x,
    cy = t1 * c2y + t * p2y
  let alpha = 90 - (Math.atan2(mx - nx, my - ny) * 180) / Math.PI
  ;(mx > nx || my < ny) && (alpha += 180)
  return {
    x: x,
    y: y,
    m: { x: mx, y: my },
    n: { x: nx, y: ny },
    start: { x: ax, y: ay },
    end: { x: cx, y: cy },
    alpha: alpha,
  }
}

function getPointAtSegmentLength(
  p1x: number,
  p1y: number,
  c1x: number,
  c1y: number,
  c2x: number,
  c2y: number,
  p2x: number,
  p2y: number,
  length: number | null = null
): number | Dots {
  if (length == null) {
    return bezlen(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y)
  } else {
    return findDotsAtSegment(
      p1x,
      p1y,
      c1x,
      c1y,
      c2x,
      c2y,
      p2x,
      p2y,
      getTatLen(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, length)
    )
  }
}

function pathLengthFactory(isTotal: number = 0, subpath: number = 0) {
  return function (
    segments: PathSegments,
    length: number,
    onlyStart: number = 0
  ): SubPaths | Point | number | string {
    segments = cloneDeep(segments)
    let x: number,
      y: number,
      p: Segment,
      sp = "",
      subpaths: Partial<SubPaths> = {},
      point: Dots,
      len = 0
    for (let i = 0, ii = segments.length; i < ii; i++) {
      p = segments[i]
      if (p[0] == "M") {
        x = +p[1]
        y = +p[2]
      } else {
        const l = getPointAtSegmentLength(x!, y!, p[1], p[2], p[3], p[4], p[5], p[6]) as number
        if (len + l > length) {
          if (subpath && !subpaths.start) {
            point = getPointAtSegmentLength(
              x!,
              y!,
              p[1],
              p[2],
              p[3],
              p[4],
              p[5],
              p[6],
              length - len
            ) as Dots
            sp += ["C" + point.start.x, point.start.y, point.m.x, point.m.y, point.x, point.y]
            if (onlyStart) {
              return sp
            }
            subpaths.start = sp
            sp = [
              "M" + point.x,
              point.y + "C" + point.n.x,
              point.n.y,
              point.end.x,
              point.end.y,
              p[5],
              p[6],
            ].join()
            len += l
            x = +p[5]
            y = +p[6]
            continue
          }
          if (!isTotal && !subpath) {
            point = getPointAtSegmentLength(
              x!,
              y!,
              p[1],
              p[2],
              p[3],
              p[4],
              p[5],
              p[6],
              length - len
            ) as Dots
            return { x: point.x, y: point.y, alpha: point.alpha }
          }
        }
        len += l
        x = +p[5]
        y = +p[6]
      }
      /* @ts-ignore */
      sp += p.shift() + p
    }
    subpaths.end = sp

    if (isTotal) {
      return len
    } else if (subpath) {
      return subpaths as SubPaths
    } else {
      /* @ts-ignore */
      point = findDotsAtSegment(x, y, p[0], p[1], p[2], p[3], p[4], p[5], 1)
      if (point.alpha) {
        return { x: point.x, y: point.y, alpha: point.alpha }
      } else {
        return point
      }
    }
  }
}

const getTotalLength = pathLengthFactory(1) as (path: PathSegments) => number
const getPointAtLength = pathLengthFactory() as (path: PathSegments) => Point
const getSubpathsAtLength = pathLengthFactory(0, 1) as (
  path: PathSegments,
  length: number,
  onlyStart?: number
) => string | SubPaths

export function parsePathD(d: string): PathCurve {
  return {
    d,
    segments: path2curve(d),
  }
}

export function calculateSubpath(path: PathCurve, from: number, to: number): string {
  if (from < 0) from = 0
  if (to < 0) to = 0
  if (from === 0 && to === 0) {
    return path.d
  }

  const total = getTotalLength(path.segments)
  to = total - to
  if (total - to < 1e-6) {
    return (getSubpathsAtLength(path.segments, from) as SubPaths).end
  }
  const a = getSubpathsAtLength(path.segments, to, 1) as string
  if (from) {
    return (getSubpathsAtLength(path2curve(a), from) as SubPaths).end
  } else {
    return a
  }
}
