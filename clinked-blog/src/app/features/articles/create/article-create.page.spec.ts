import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArticleCreatePage } from './article-create.page';

describe('ArticleCreatePage', () => {
  let component: ArticleCreatePage;
  let fixture: ComponentFixture<ArticleCreatePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticleCreatePage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArticleCreatePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
