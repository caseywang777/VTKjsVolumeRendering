
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
    // const tfUI = new VTKjsTrasnferFunctionInterface("#TFInterface", 800, 180, 0.8, renderWindow.render, volumeActor.getProperty, minMax,
    //                                                 opaCtrlPoint, -1, colorCtrlPoint);
    // const tfUI = new VTKjsTrasnferFunctionInterface("#TFInterface", 800, 180, 0.8, renderWindow.render, volumeActor.getProperty, minMax,
    //                                                 null,  -1, colorCtrlPoint);
    const tfUI = new VTKjsTrasnferFunctionInterface("#TFInterface", 800, 180, 0.8, renderWindow.render, volumeActor.getProperty, minMax,
                                                    null, 10, d3.interpolateRdBu);

  }
  
  volumeRendering();
  
  
  
  
