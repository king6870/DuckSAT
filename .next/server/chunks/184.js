"use strict";exports.id=184,exports.ids=[184],exports.modules={50184:(a,b,c)=>{c.d(b,{imageGenerationService:()=>h});var d=c(79748),e=c(33873),f=c(29021);class g{constructor(){this.DALLE_ENDPOINT="https://ai-manojwin82958ai594424696620.openai.azure.com/openai/deployments/dall-e-3/images/generations?api-version=2024-02-01",this.API_KEY=process.env.AZURE_OPENAI_API_KEY||"",this.IMAGES_DIR=(0,e.join)(process.cwd(),"public","generated-images"),this.ensureImagesDirectory()}async generateChartImage(a){try{console.log("\uD83C\uDFA8 Generating chart image with DALL-E...");let b=this.buildImagePrompt(a),c=await fetch(this.DALLE_ENDPOINT,{method:"POST",headers:{Authorization:`Bearer ${this.API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({prompt:b,n:1,size:"1024x1024",quality:"standard",style:"natural"})});if(!c.ok)return console.error("DALL-E API Error:",c.status,c.statusText),null;let d=await c.json(),e=d.data?.[0]?.url;if(e){let b=await this.downloadAndSaveImage(e,a.type);return console.log("✅ Chart image generated and saved:",b),b}return null}catch(a){return console.error("Chart image generation failed:",a),null}}async generateSVGChart(a){try{console.log("\uD83D\uDCCA Generating SVG chart programmatically...");let b="";switch(a.type){case"coordinate-plane":b=this.generateCoordinatePlane(a);break;case"bar-chart":b=this.generateBarChart(a);break;case"scatter-plot":b=this.generateScatterPlot(a);break;case"function-graph":b=this.generateFunctionGraph(a);break;default:return null}if(b){let c=`chart-${Date.now()}-${a.type}.svg`,f=(0,e.join)(this.IMAGES_DIR,c);return await (0,d.writeFile)(f,b),`/generated-images/${c}`}return null}catch(a){return console.error("SVG chart generation failed:",a),null}}buildImagePrompt(a){let b="Create a clean, educational mathematical chart or graph suitable for SAT practice. ";switch(a.type){case"coordinate-plane":return b+"Generate a coordinate plane with grid lines, labeled axes, and the mathematical elements described. Use clear, readable fonts and high contrast colors. "+a.description;case"bar-chart":return b+"Create a professional bar chart with labeled axes, clear data bars, and readable text. Use educational colors and clean design. "+a.description;case"scatter-plot":return b+"Generate a scatter plot with clearly marked data points, labeled axes, and any trend lines mentioned. Use professional styling. "+a.description;case"box-plot":return b+"Create a box plot diagram with clearly marked quartiles, median, and outliers. Use educational formatting. "+a.description;case"geometric-diagram":return b+"Generate a geometric diagram with labeled angles, sides, and vertices. Use clear lines and professional mathematical notation. "+a.description;case"function-graph":return b+"Create a function graph with coordinate axes, grid lines, and the plotted function. Use clear mathematical styling. "+a.description;default:return b+a.description}}async downloadAndSaveImage(a,b){let c=await fetch(a),f=await c.arrayBuffer(),g=`chart-${Date.now()}-${b}.png`,h=(0,e.join)(this.IMAGES_DIR,g);return await (0,d.writeFile)(h,Buffer.from(f)),`/generated-images/${g}`}generateCoordinatePlane(a){let b=a.width||400,c=a.height||400;return`
      <svg width="${b}" height="${c}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" stroke-width="1"/>
          </pattern>
        </defs>
        
        <!-- Grid -->
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        <!-- Axes -->
        <line x1="0" y1="${c/2}" x2="${b}" y2="${c/2}" stroke="#333" stroke-width="2"/>
        <line x1="${b/2}" y1="0" x2="${b/2}" y2="${c}" stroke="#333" stroke-width="2"/>
        
        <!-- Axis labels -->
        <text x="${b-10}" y="${c/2-5}" font-family="Arial" font-size="12" fill="#333">x</text>
        <text x="${b/2+5}" y="15" font-family="Arial" font-size="12" fill="#333">y</text>
        
        <!-- Origin -->
        <circle cx="${b/2}" cy="${c/2}" r="3" fill="#333"/>
        <text x="${b/2+5}" y="${c/2+15}" font-family="Arial" font-size="10" fill="#333">0</text>
      </svg>
    `}generateBarChart(a){let b=a.width||400,c=a.height||300,d=a.data||[10,25,15,30,20],e=Math.max(...d),f=b/(1.5*d.length),g="";return d.forEach((a,b)=>{let d=a/e*(c-50),h=(b+.5)*f,i=c-d-30;g+=`
        <rect x="${h}" y="${i}" width="${.8*f}" height="${d}" fill="#4f46e5"/>
        <text x="${h+.4*f}" y="${c-10}" font-family="Arial" font-size="10" text-anchor="middle">${b+1}</text>
        <text x="${h+.4*f}" y="${i-5}" font-family="Arial" font-size="10" text-anchor="middle">${a}</text>
      `}),`
      <svg width="${b}" height="${c}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        ${g}
        <!-- Axes -->
        <line x1="30" y1="${c-30}" x2="${b-30}" y2="${c-30}" stroke="#333" stroke-width="2"/>
        <line x1="30" y1="30" x2="30" y2="${c-30}" stroke="#333" stroke-width="2"/>
      </svg>
    `}generateScatterPlot(a){let b=a.width||400,c=a.height||300,d=a.data||[[1,2],[2,4],[3,3],[4,6],[5,5]],e="";return d.forEach(([a,d])=>{e+=`<circle cx="${50+a/6*(b-100)}" cy="${c-50-d/8*(c-100)}" r="4" fill="#ef4444"/>`}),`
      <svg width="${b}" height="${c}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        ${e}
        <!-- Axes -->
        <line x1="50" y1="${c-50}" x2="${b-50}" y2="${c-50}" stroke="#333" stroke-width="2"/>
        <line x1="50" y1="50" x2="50" y2="${c-50}" stroke="#333" stroke-width="2"/>
      </svg>
    `}generateFunctionGraph(a){let b=a.width||400,c=a.height||400,d="M";for(let a=-10;a<=10;a+=.5){let e=a*a/4,f=b/2+15*a,g=c/2-5*e;d+=` ${f},${g}`}return`
      <svg width="${b}" height="${c}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        
        <!-- Grid -->
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        <!-- Axes -->
        <line x1="0" y1="${c/2}" x2="${b}" y2="${c/2}" stroke="#333" stroke-width="2"/>
        <line x1="${b/2}" y1="0" x2="${b/2}" y2="${c}" stroke="#333" stroke-width="2"/>
        
        <!-- Function curve -->
        <path d="${d}" fill="none" stroke="#2563eb" stroke-width="3"/>
      </svg>
    `}async ensureImagesDirectory(){(0,f.existsSync)(this.IMAGES_DIR)||await (0,d.mkdir)(this.IMAGES_DIR,{recursive:!0})}}let h=new g}};