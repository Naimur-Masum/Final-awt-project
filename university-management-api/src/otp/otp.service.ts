import { Injectable } from '@nestjs/common';



@Injectable()
export class OtpService {
  
  generateOtp() {
    // Step 22: Generate 6-digit random number
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Step 21: Set expiration (5 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    return { code, expiresAt };
  }
}
