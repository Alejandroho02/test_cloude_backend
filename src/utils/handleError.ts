import { Response } from 'express';

export const handleError = (res: Response, statusCode: number, errorType: string, devTool: string) => {   

   res.status(statusCode).json({
      type: errorType,
      error: {
         statusCode,
         dev_tool: devTool
      }
   }); 
};