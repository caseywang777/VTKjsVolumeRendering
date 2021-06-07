class VTKjsTrasnferFunctionInterface {
    //need d3 and d3.tip .js
    // _parentElementID: ID (with #) of the html tag (usually a <div>) to contain this TF interface
    //_visWidth, _visHeight: width and height in pixel of this tf interface
    //_updateRenderFunc: function to call vtk.js to rerender the volume
    //_getVolumeActorPropertyFunc: function to get the volume actor from vtk.js
    //_minMax: min and max value of the volume, e.g. [-400.23, 200.12]
    //_initOpaCtrolPoint: array of opacity control point, each element is a opacity control point [dataValue, opacity(0-1)], 
    //                    the first and last data value should match min max value of the data, 
    //                    data value should be from small to large
    //                    e.g. [[-400.23, 0.12], [-200, 0.5], [200.12, 1.0]], can be arbitrary length
    //_initColorCtrlPoint: array of color control point, each elememnt is a color control point [datavalue, R, G, B (0-1)]
    //                    the first and last data value should match min max value of the data, 
    //                    data value should be from small to large
    //                    e.g. [[-400.23, 1.0, 0.0, 0.0], [-100, 0.0, 0.0, 1.0], [200.12, 1.0, 1.0, 0.0]] , can be arbitrary length
    constructor(_parentElementID, _visWidth, _visHeight, _updateRenderFunc, _getVolumeActorPropertyFunc, _minMax,
                _initOpaCtrolPoint, _initColorCtrlPoint){
        this.parentElementID = _parentElementID;
        this.tfSvgWidth = _visWidth;
        this.tfSvgHeight = _visHeight;
        this.updateRenderFunc = _updateRenderFunc;
        this.getVolumeActorPropertyFunc = _getVolumeActorPropertyFunc;
        this.minMax = _minMax;
        this.opaCtrlPoint = _initOpaCtrolPoint;
        this.opacityFactor = 1.0;
        this.colorCtrlPoint = _initColorCtrlPoint;

        this.initProps(this, this.getVolumeActorPropertyFunc()); //set the volume Actor property (TF)

        this.initVis();

        this.updateRenderFunc();
    }

    initVis(){
        const vis = this;

        ///// setup basic svg and g and margin
        var tfSvgWidth = this.tfSvgWidth, tfSvgHeight = this.tfSvgHeight;
        var tfMargin = {top: 20, right: 20, bottom: 30, left: 50};
        var tfWidth =  tfSvgWidth - tfMargin.left - tfMargin.right;
        var tfHeight = tfSvgHeight - tfMargin.top - tfMargin.bottom;
        let g = d3.select(this.parentElementID).append("g");
        let svg = g.append("svg").attr("width", tfSvgWidth).attr("height", tfSvgHeight);

        ///// color function setup
        let defs = svg.append("defs");
        let gradient = defs.append("linearGradient").attr("id", "svgGradient");
        vis.colorCtrlPoint.forEach(d=>{
            gradient.append("stop").attr("offset", (((d[0]-vis.minMax[0])/(vis.minMax[1]-vis.minMax[0]))*100).toString() + "%" )
                                   .attr("stop-color", d3.rgb(d[1]*255, d[2]*255, d[3]*255));
        });

        ///// create basic tf interface 
        let tfG = svg.append("g").attr("transform", `translate(${tfMargin.left}, ${tfMargin.top})`);
        let xScale = d3.scaleLinear().domain(vis.minMax).range([0, tfWidth]);
        let xAxis = d3.axisBottom(xScale).ticks(5);
        let xAxisG = tfG.append('g').attr("transform", `translate(0, ${tfHeight})`).call(xAxis);
        let yScale = d3.scaleLinear().domain([1, 0]).range([0, tfHeight]);
        let yAxis = d3.axisLeft(yScale).ticks(5);
        let yAxisG = tfG.append('g').attr("transform", `translate(0, 0)`).call(yAxis);
        tfG.append("rect").attr("x", 0).attr("y", 0).attr("width", tfWidth).attr("height", tfHeight).attr("opacity", "0"); //just to on click
        let areaGenerator = d3.area().x(d => xScale(d[0])).y0(d=>yScale(d[1]*vis.opacityFactor)).y1(yScale(0));
        let opaAreaPath = tfG.append("path").attr("d", areaGenerator(vis.opaCtrlPoint)).attr("opacity", "1.0").style("fill", "url(#svgGradient)");
        let lineGenerator = d3.line().x(d => xScale(d[0])).y(d=>yScale(d[1]*vis.opacityFactor));
        let opaLinePath = tfG.append("path").attr("d", lineGenerator(vis.opaCtrlPoint)).attr("stroke", "black").attr("stroke-width", 2).attr("fill", "none");
        let circles = tfG.selectAll("circle").data(vis.opaCtrlPoint).enter().append("circle")
                        .attr("cx", d=>xScale(d[0])).attr("cy", d=>yScale(d[1])).attr("r", "6").attr("fill", "black");

        ///// scroll to adjust opacity factor
        let zoom = d3.zoom().scaleExtent([0.001, 1]).on("zoom", function(){
            vis.opacityFactor = d3.event.transform.k;
            updateTFInterface();
        });
        svg.call(zoom);

        /////  click to add opacity control point
        tfG.on("click", function(){
            let mousePosX = d3.mouse(this)[0];
            let mousePosY = d3.mouse(this)[1];
            let newDataVale = xScale.invert(mousePosX);
            let newOpacity = yScale.invert(mousePosY)/vis.opacityFactor;
            let idx = vis.opaCtrlPoint.findIndex(d=>(d[0] > newDataVale));
            vis.opaCtrlPoint.splice(idx, 0, [newDataVale, newOpacity]);
            updateTFInterface();
        });

        ///// tool tip object (without enabling listerner)
        let tip = d3.tip().attr('class', 'd3-tip')
                    .html(d=>(d[0].toFixed(2) + ": [" + (d[1]*vis.opacityFactor).toFixed(2) + "]"));    

        //// drag object for opctity ctrl point dragging (without enabling listerner)
        let drag = d3.drag().on("drag", function(){
            let mousePosX = d3.mouse(this)[0];
            let mousePosY = d3.mouse(this)[1];
            
            if( mousePosY > tfHeight ) mousePosY = tfHeight;
            
            if( mousePosY < 0 )mousePosY = 0;
            var circle = d3.select(this);
            let selectedIndex = 0

            circles.nodes().forEach(function(d, i){
                if( d === circle.nodes()[0])selectedIndex = i;
            });
     
            let prevPointX = (selectedIndex == 0) ? mousePosX : parseFloat(circles.filter((d,i)=>i==(selectedIndex-1)).attr("cx"));
            let nextPointX = (selectedIndex == vis.opaCtrlPoint.length-1) ? mousePosX : parseFloat(circles.filter((d,i)=>i==(selectedIndex+1)).attr("cx"));

            if( mousePosX < prevPointX &&  selectedIndex > 0 && selectedIndex < vis.opaCtrlPoint.length - 1) mousePosX = prevPointX + 0.0001;
            if( mousePosX > nextPointX &&  selectedIndex > 0 && selectedIndex < vis.opaCtrlPoint.length - 1) mousePosX = nextPointX - 0.0001;
            
            if( selectedIndex == 0 || selectedIndex == vis.opaCtrlPoint.length - 1 ){
                vis.opaCtrlPoint[selectedIndex][1] = yScale.invert(mousePosY)/vis.opacityFactor;
            }else{
                vis.opaCtrlPoint[selectedIndex][0] = xScale.invert(mousePosX);
                vis.opaCtrlPoint[selectedIndex][1] = yScale.invert(mousePosY)/vis.opacityFactor;
            }

            updateTFInterface();
        });

        setupCtrlPointEvent(); //initialization: first time, enable listerner on control points(circles)

        //// update the view of the tf interface (after opacity array and opacity facetor has been updated)
        function updateTFInterface(){ //all change share same update function is not an efficient implmentation (but clear)
            yScale = d3.scaleLinear().domain([vis.opacityFactor, 0]).range([0, tfHeight]);
            yAxis = d3.axisLeft(yScale).ticks(5);
            yAxisG.transition().duration(50).call(yAxis);

            let circlesUpdate = tfG.selectAll("circle").data(vis.opaCtrlPoint, d=>d);
            let circleEnter = circlesUpdate.enter().append("circle");
            let circleExit = circlesUpdate.exit().remove();
            circles = circleEnter.merge(circlesUpdate).attr("cx", d=>xScale(d[0])).attr("cy", d=>yScale(d[1]*vis.opacityFactor)).attr("r", "6").attr("fill", "black");
            setupCtrlPointEvent();
            opaAreaPath.attr("d", areaGenerator(vis.opaCtrlPoint));
            opaLinePath.attr("d", lineGenerator(vis.opaCtrlPoint));
            vis.initProps(vis, vis.getVolumeActorPropertyFunc()); //change transfer function here
            vis.updateRenderFunc();
        }

        //// enable or reset listener on control points (circles)
        function setupCtrlPointEvent(){
            circles.call(tip);
            circles.on('mouseover', tip.show).on('mousemove', tip.show).on('mouseout', tip.hide);
            circles.call(drag);
            //// right click to remove a opacity control point
            circles.on('contextmenu', function(d,i){
                d3.event.preventDefault(); //disable default menu popout
                if( i > 0 && i < vis.opaCtrlPoint.length - 1) {
                    vis.opaCtrlPoint.splice(i, 1);
                    updateTFInterface();
                    tip.hide();
                }
            });
        }
    }
    

    initProps(vis, property) {
        function newColorFunction() {
            let fun = vtk.Rendering.Core.vtkColorTransferFunction.newInstance();
            vis.colorCtrlPoint.forEach(d=>fun.addRGBPoint(d[0], d[1], d[2], d[3]));
            return fun;
        }
    
        function newOpacityFunction() {
            let fun = vtk.Common.DataModel.vtkPiecewiseFunction.newInstance();
            vis.opaCtrlPoint.forEach(d=>fun.addPoint(d[0], d[1]*vis.opacityFactor));
            return fun;
        }
        property.setRGBTransferFunction(0, newColorFunction());
        property.setScalarOpacity(0, newOpacityFunction());
        property.setScalarOpacityUnitDistance(0, 1.732050807568877);
    }
}

async function volumeRendering(){
    ////// HTML
    container = document.createElement('div');
    container.setAttribute("style","width:800px");
    document.querySelector('body').appendChild(container);

    //// source
    const response = await fetch('../pf20.bin')
    let buffer = await response.arrayBuffer() // 取得 ArrayBuffer 實例
    // console.log(buffer.byteLength)
    // console.log(buffer)
    const f32 = new Float32Array(buffer);
    // console.log(f32[10000000]);
  
      let minMax = f32.reduce(  (acc, val) =>{
      acc[0] = ( acc[0] === undefined || val < acc[0] ) ? val : acc[0]
            acc[1] = ( acc[1] === undefined || val > acc[1] ) ? val : acc[1]
            return acc;
    }, []);
  
    let width = 500, height = 500, depth = 100;
    let scalars = vtk.Common.Core.vtkDataArray.newInstance({
        values: f32,
        numberOfComponents: 1, // number of channels 
        dataType: vtk.Common.Core.vtkDataArray.VtkDataTypes.FLOAT, // values encoding
        name: 'scalars'
        
    });

    let imageData = vtk.Common.DataModel.vtkImageData.newInstance();
    imageData.setOrigin(0, 0, 0);
    imageData.setSpacing(1, 1, 1);
    imageData.setExtent(0, width - 1, 0, height - 1, 0, depth - 1);
    imageData.getPointData().setScalars(scalars);

    //// filter 
    //// no filter for volume rendering
    
    ///// mapper
    let volumeMapper = vtk.Rendering.Core.vtkVolumeMapper.newInstance();
    volumeMapper.setInputData(imageData);   // source -> no filter -> mapper directly
    // volumeMapper.setSampleDistance(1.5);
    // volumeMapper.setBlendModeToMaximumIntensity()

    ///// actor
    let volumeActor = vtk.Rendering.Core.vtkVolume.newInstance();
    volumeActor.setMapper(volumeMapper);  //mapper -> actor

    ///// renderer
    const renderer = vtk.Rendering.Core.vtkRenderer.newInstance({ background: [0.2, 0.3, 0.4] });
    renderer.addActor(volumeActor); /// actor -> renderer
    renderer.getActiveCamera().set({ position: [1, 1, 0], viewUp: [0, 0, -1] });
    renderer.resetCamera();

    ///// renderer window    
    const renderWindow = vtk.Rendering.Core.vtkRenderWindow.newInstance();
    renderWindow.addRenderer(renderer);  //renderer -> renderer window
    const openglRenderWindow = vtk.Rendering.OpenGL.vtkRenderWindow.newInstance();
    openglRenderWindow.setSize(1000, 1000);
    openglRenderWindow.setContainer(container);
    renderWindow.addView(openglRenderWindow);   //renderer window -> openGL renderwindow

    ///// interactor
    const interactor = vtk.Rendering.Core.vtkRenderWindowInteractor.newInstance();
    interactor.setView(openglRenderWindow);   ///render window -> interactor
    interactor.initialize();
    interactor.bindEvents(container);
    interactor.setInteractorStyle(vtk.Interaction.Style.vtkInteractorStyleTrackballCamera.newInstance());
    
    
    /// d3 transfer function panel
    ///init transfer function
    let opaCtrlPoint = [];
    let colorCtrlPoint = [];
    opaCtrlPoint.push([minMax[0], 0]);
    opaCtrlPoint.push([(minMax[1]-minMax[0])/4*1 + minMax[0], 0.3]);
    opaCtrlPoint.push([(minMax[1]-minMax[0])/4*2 + minMax[0], 0.3]);
    opaCtrlPoint.push([(minMax[1]-minMax[0])/4*3 + minMax[0], 0.3]);
    opaCtrlPoint.push([minMax[1], 1]);
    colorCtrlPoint.push([minMax[0], 0 , 0, 143/255]);
    colorCtrlPoint.push([(minMax[1]-minMax[0])/4*1 + minMax[0]+1, 0, 1, 1]);
    colorCtrlPoint.push([(minMax[1]-minMax[0])/4*2 + minMax[0], 1, 1, 0]);
    colorCtrlPoint.push([(minMax[1]-minMax[0])/4*3 + minMax[0], 1, 82/255, 0]);
    colorCtrlPoint.push([minMax[1], 0.5, 0, 0]);
    const tfUI = new VTKjsTrasnferFunctionInterface("#TFInterface", 800, 150, renderWindow.render, volumeActor.getProperty, minMax,
                                                    opaCtrlPoint, colorCtrlPoint);

  }
  
  volumeRendering();
  
  
  
  
