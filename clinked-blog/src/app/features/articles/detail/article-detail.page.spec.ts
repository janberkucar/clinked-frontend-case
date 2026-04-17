import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArticleDetailPage } from './article-detail.page';

describe('ArticleDetailPage', () => {
  let component: ArticleDetailPage;
  let fixture: ComponentFixture<ArticleDetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticleDetailPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArticleDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
