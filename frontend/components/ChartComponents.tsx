import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

export interface ChartData {
  label: string
  value: number
  color?: string
}

export interface BarChartProps {
  data: ChartData[]
  title?: string
  className?: string
  height?: number
  showValues?: boolean
  showGrid?: boolean
  animated?: boolean
}

export function BarChart({
  data,
  title,
  className,
  height = 300,
  showValues = true,
  showGrid = true,
  animated = true
}: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  const [animationComplete, setAnimationComplete] = React.useState(!animated)

  React.useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setAnimationComplete(true), 100)
      return () => clearTimeout(timer)
    }
  }, [animated])

  return (
    <Card className={cn("bg-white/90 backdrop-blur-xl border-0 shadow-lg", className)}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div style={{ height }} className="relative">
          {/* Grid lines */}
          {showGrid && (
            <div className="absolute inset-0 flex flex-col justify-between">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border-t border-gray-200 first:border-t-0" />
              ))}
            </div>
          )}
          
          {/* Chart bars */}
          <div className="flex items-end justify-between h-full space-x-2 relative z-10">
            {data.map((item, index) => {
              const barHeight = maxValue > 0 ? (item.value / maxValue) * (height - 40) : 0
              const actualHeight = animationComplete ? barHeight : 0
              
              return (
                <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                  {/* Bar */}
                  <div className="flex flex-col items-center justify-end" style={{ height: height - 40 }}>
                    <div 
                      className={cn(
                        "w-full rounded-t-md min-h-[4px] flex items-end justify-center text-white text-xs font-semibold transition-all duration-1000 ease-out",
                        item.color || "bg-gradient-to-t from-blue-500 to-blue-400"
                      )}
                      style={{ 
                        height: `${actualHeight}px`,
                        background: item.color || "linear-gradient(to top, #3b82f6, #60a5fa)"
                      }}
                    >
                      {showValues && actualHeight > 20 && (
                        <span className="pb-2">{item.value}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Label */}
                  <div className="text-xs font-medium text-gray-600 text-center">
                    {item.label}
                  </div>
                  
                  {/* Value below label if bar is too short */}
                  {showValues && actualHeight <= 20 && (
                    <div className="text-xs font-semibold text-gray-700">
                      {item.value}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export interface LineChartProps {
  data: ChartData[]
  title?: string
  className?: string
  height?: number
  showGrid?: boolean
  animated?: boolean
  lineColor?: string
}

export function LineChart({
  data,
  title,
  className,
  height = 300,
  showGrid = true,
  animated = true,
  lineColor = "#3b82f6"
}: LineChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const [animationProgress, setAnimationProgress] = React.useState(0)

  React.useEffect(() => {
    if (animated) {
      const timer = setInterval(() => {
        setAnimationProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer)
            return 100
          }
          return prev + 2
        })
      }, 20)
      return () => clearInterval(timer)
    } else {
      setAnimationProgress(100)
    }
  }, [animated])

  const getY = (value: number) => {
    if (maxValue === minValue) return height / 2
    return height - 40 - ((value - minValue) / (maxValue - minValue)) * (height - 80)
  }

  const pathData = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = getY(item.value)
    return { x, y, value: item.value }
  })

  const pathString = pathData
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x}% ${point.y}px`)
    .join(' ')

  return (
    <Card className={cn("bg-white/90 backdrop-blur-xl border-0 shadow-lg", className)}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div style={{ height }} className="relative">
          {/* Grid lines */}
          {showGrid && (
            <>
              <div className="absolute inset-0 flex flex-col justify-between">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="border-t border-gray-200 first:border-t-0" />
                ))}
              </div>
              <div className="absolute inset-0 flex justify-between">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="border-l border-gray-200 first:border-l-0" />
                ))}
              </div>
            </>
          )}
          
          {/* SVG for line */}
          <svg className="absolute inset-0 w-full h-full overflow-visible">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.1" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0.8" />
              </linearGradient>
            </defs>
            
            {/* Area under curve */}
            <path
              d={`${pathString} L 100% ${height}px L 0% ${height}px Z`}
              fill="url(#lineGradient)"
              opacity={animationProgress / 100}
              className="transition-opacity duration-1000"
            />
            
            {/* Line */}
            <path
              d={pathString}
              stroke={lineColor}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={animated ? "1000" : "0"}
              strokeDashoffset={animated ? 1000 - (1000 * animationProgress / 100) : 0}
              className="transition-all duration-2000 ease-out"
            />
            
            {/* Data points */}
            {pathData.map((point, index) => (
              <circle
                key={index}
                cx={`${point.x}%`}
                cy={`${point.y}px`}
                r="4"
                fill={lineColor}
                opacity={animationProgress >= (index + 1) * (100 / data.length) ? 1 : 0}
                className="transition-opacity duration-300"
              />
            ))}
          </svg>
          
          {/* Labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between">
            {data.map((item, index) => (
              <div key={index} className="text-xs font-medium text-gray-600 text-center">
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export interface PieChartProps {
  data: ChartData[]
  title?: string
  className?: string
  size?: number
  animated?: boolean
  showLegend?: boolean
}

export function PieChart({
  data,
  title,
  className,
  size = 200,
  animated = true,
  showLegend = true
}: PieChartProps) {
  const [animationProgress, setAnimationProgress] = React.useState(0)
  const total = data.reduce((sum, item) => sum + item.value, 0)
  
  React.useEffect(() => {
    if (animated) {
      const timer = setInterval(() => {
        setAnimationProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer)
            return 100
          }
          return prev + 2
        })
      }, 20)
      return () => clearInterval(timer)
    } else {
      setAnimationProgress(100)
    }
  }, [animated])

  let currentAngle = 0
  const slices = data.map((item, index) => {
    const percentage = (item.value / total) * 100
    const angle = (percentage / 100) * 360 * (animationProgress / 100)
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle += (percentage / 100) * 360

    const radius = size / 2 - 10
    const centerX = size / 2
    const centerY = size / 2

    const x1 = centerX + radius * Math.cos((startAngle - 90) * Math.PI / 180)
    const y1 = centerY + radius * Math.sin((startAngle - 90) * Math.PI / 180)
    const x2 = centerX + radius * Math.cos((endAngle - 90) * Math.PI / 180)
    const y2 = centerY + radius * Math.sin((endAngle - 90) * Math.PI / 180)

    const largeArc = angle > 180 ? 1 : 0

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ')

    return {
      ...item,
      pathData,
      percentage,
      color: item.color || `hsl(${(index * 137.5) % 360}, 70%, 50%)`
    }
  })

  return (
    <Card className={cn("bg-white/90 backdrop-blur-xl border-0 shadow-lg", className)}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="flex items-center space-x-6">
          {/* Pie chart */}
          <svg width={size} height={size} className="flex-shrink-0">
            {slices.map((slice, index) => (
              <path
                key={index}
                d={slice.pathData}
                fill={slice.color}
                className="transition-all duration-300 hover:opacity-80"
              />
            ))}
          </svg>
          
          {/* Legend */}
          {showLegend && (
            <div className="space-y-2">
              {slices.map((slice, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: slice.color }}
                  />
                  <div className="text-sm">
                    <span className="font-medium">{slice.label}</span>
                    <span className="text-gray-600 ml-2">
                      {slice.value} ({slice.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}