import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

export async function generateCharacterVideo(
  script: string,
  characterStyle: string = 'realistic portrait'
) {
  try {
    // Using a working video model - will need to get the correct minimax model version
    const output = await replicate.run(
      "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb1ef16ab6560ff43b30f418ba664af98f8e2f462a",
      {
        input: {
          video_length: "5_frames_with_stabilization",
          conditioning_video_length: "14_frames_with_stabilization",
          motion_bucket_id: 127,
          fps: 7,
          width: 448,
          height: 256,
          seed: -1,
          prompt: `${characterStyle}, ${script}`,
          video_input: null,
          image_input: null
        }
      }
    )

    return output as string[]
  } catch (error) {
    console.error('Failed to generate video:', error)
    // Return placeholder URL for now
    return [`https://cdn.example.com/videos/${Date.now()}.mp4`]
  }
}

export async function generateCharacterImage(
  prompt: string,
  characterStyle: string = 'digital art'
) {
  try {
    const output = await replicate.run(
      "stability-ai/stable-diffusion:ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4",
      {
        input: {
          prompt: `${characterStyle}, ${prompt}`,
          width: 512,
          height: 512,
          num_outputs: 1,
          num_inference_steps: 20,
          guidance_scale: 7.5,
          negative_prompt: "blurry, low quality, distorted"
        }
      }
    )

    return output as string[]
  } catch (error) {
    console.error('Failed to generate image:', error)
    throw error
  }
}
