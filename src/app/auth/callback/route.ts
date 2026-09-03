import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error('exchangeCodeForSession error:', exchangeError);
        return NextResponse.redirect(`${origin}/?error=unauthorized`);
      }
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('getUser error:', userError);
        return NextResponse.redirect(`${origin}/?error=unauthorized`);
      }
      
      const userEmail = user.email?.trim().toLowerCase();
      console.log('User signed in with email:', userEmail);
      
      if (userEmail) {
        const { data: familyMember, error: memberError } = await supabase
          .from('family_members')
          .select('id, name, display_name, email')
          .ilike('email', userEmail)
          .maybeSingle();
          
        console.log('Family member match:', familyMember, 'Error:', memberError);
        
        if (memberError || !familyMember) {
          console.warn('Unauthorized login attempt by:', userEmail);
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/?error=unauthorized`);
        }
        
        return NextResponse.redirect(`${origin}/home`);
      }
    } catch (error) {
      console.error('Unexpected callback error:', error);
      return NextResponse.redirect(`${origin}/?error=unauthorized`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=unauthorized`);
}
